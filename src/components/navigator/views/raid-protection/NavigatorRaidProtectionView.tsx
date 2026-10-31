import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { LocalizeText, localizeWithFallback, NotificationBubbleType } from '../../../../api';
import {
    IRaidProtectionEditable,
    RAID_PROTECTION_ACTION_KICK,
    RAID_PROTECTION_BAN_DURATIONS,
    RAID_PROTECTION_DURATION_FALLBACKS,
    RAID_PROTECTION_GUARD_DURATIONS,
    RAID_PROTECTION_SENSITIVITIES,
    RAID_PROTECTION_SENSITIVITY_FALLBACKS,
    RAID_PROTECTION_SENSITIVITY_KEYS,
    raidProtectionNeedsConfirmation,
    raidProtectionSaveResultKey
} from '../../../../api/navigator/RaidProtection';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { Checkbox } from '../../../../common/Checkbox';
import { UbuntuDropmenuView } from '../../../../common/dropmenu/UbuntuDropmenuView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import {
    isCurrentRaidProtectionRoom,
    sendRaidProtectionSave,
    useNavigatorData,
    useNotificationActions,
    useRaidProtectionController,
    useRaidProtectionStore
} from '../../../../hooks';

const text = (key: string, fallback: string) => localizeWithFallback(`raid.protection.settings.${ key }`, fallback);

const sensitivityOptions = () => RAID_PROTECTION_SENSITIVITIES.map((value, index) => ({
    value,
    label: text(`sensitivity.${ RAID_PROTECTION_SENSITIVITY_KEYS[index] }`, RAID_PROTECTION_SENSITIVITY_FALLBACKS[index])
}));

const durationOptions = (durations: readonly number[]) => durations.map(value => ({
    value,
    label: text(`duration.${ value }`, RAID_PROTECTION_DURATION_FALLBACKS[value] ?? `${ value }`)
}));

/**
 * AIR raid_protection_settings_xml (navigator/raidprotection/RaidProtectionSettingsView): the advice
 * card, protection on/off with detection sensitivity, action and ban duration, the guard card, the
 * raid status line and cancel / save. Opened from the room info button (navigator/raidprotection/&lt;id&gt;).
 */
export const NavigatorRaidProtectionView: FC<{}> = () =>
{
    const { simpleAlert = null, showConfirm = null, showSingleBubble = null } = useNotificationActions();
    const { navigatorData } = useNavigatorData();
    const visibleRoomId = useRaidProtectionStore(state => state.visibleRoomId);
    const settings = useRaidProtectionStore(state => state.settings);
    const savingRoomId = useRaidProtectionStore(state => state.savingRoomId);
    const [ form, setForm ] = useState<IRaidProtectionEditable | null>(null);
    const [ confirming, setConfirming ] = useState(false);
    const confirmTokenRef = useRef(0);

    const onSaveResult = useCallback((resultCode: number) =>
    {
        const message = LocalizeText(raidProtectionSaveResultKey(resultCode));

        if(resultCode === 0) showSingleBubble?.(message, NotificationBubbleType.INFO);
        else simpleAlert?.(message, null, null, null, text('title', 'Raid protection'));
    }, [ showSingleBubble, simpleAlert ]);

    useRaidProtectionController(onSaveResult);

    const visible = visibleRoomId > 0 && settings?.roomId === visibleRoomId;

    // AIR update(): the controls follow every settings packet for the room the window shows.
    useEffect(() =>
    {
        if(!visible || !settings) return;

        setForm({
            roomId: settings.roomId,
            enabled: settings.enabled,
            sensitivity: settings.sensitivity,
            actionType: settings.actionType,
            banDurationSeconds: settings.banDurationSeconds,
            guardEnabled: settings.guardEnabled,
            guardDurationSeconds: settings.guardDurationSeconds,
            guardSensitivity: settings.guardSensitivity
        });
    }, [ visible, settings ]);

    // A closed window drops a pending confirmation (AIR _r7fcbccc37fb3a9).
    useEffect(() =>
    {
        if(visible) return;

        confirmTokenRef.current++;
        setConfirming(false);
    }, [ visible ]);

    if(!visible || !form || !settings) return null;

    const enteredRoomId = navigatorData?.enteredGuestRoom?.roomId ?? 0;
    const busy = confirming || savingRoomId === form.roomId;
    const update = (patch: Partial<IRaidProtectionEditable>) => setForm(previous => (previous ? { ...previous, ...patch } : previous));
    const close = () => useRaidProtectionStore.getState().close();

    const save = () =>
    {
        const store = useRaidProtectionStore.getState();
        const stored = store.settings;

        if(!stored || stored.roomId !== form.roomId || store.savingRoomId !== 0) return;

        if(!isCurrentRaidProtectionRoom(form.roomId, enteredRoomId) || store.manageableRoomId !== form.roomId)
        {
            store.clearRoom(form.roomId);

            return;
        }

        if(!raidProtectionNeedsConfirmation(stored, form))
        {
            sendRaidProtectionSave(form, false);

            return;
        }

        const token = ++confirmTokenRef.current;
        const requested = form;

        setConfirming(true);
        showConfirm?.(
            LocalizeText(stored.incidentActive ? 'raid.protection.settings.confirm.active' : 'raid.protection.settings.confirm.inactive'),
            () =>
            {
                setConfirming(false);

                const current = useRaidProtectionStore.getState();

                // AIR onConfirmation: only when nothing changed while the question was open.
                if(token !== confirmTokenRef.current || current.settings !== stored || current.settings.enabled || current.savingRoomId !== 0) return;
                if(!isCurrentRaidProtectionRoom(requested.roomId, enteredRoomId) || current.manageableRoomId !== requested.roomId) return;

                sendRaidProtectionSave(requested, true);
            },
            () => setConfirming(false),
            null,
            null,
            text('confirm.title', 'Turn on raid protection?')
        );
    };

    const protectionDisabled = !form.enabled;
    const banDisabled = !form.enabled || form.actionType === RAID_PROTECTION_ACTION_KICK;
    const guardDisabled = !form.enabled || !form.guardEnabled;
    const inactiveText = settings.lastRaidAtEpochSeconds > 0
        ? localizeWithFallback('raid.protection.settings.status.inactive.last', 'There is no raid going on. Last raid: %timestamp%', [ 'timestamp' ], [ new Date(settings.lastRaidAtEpochSeconds * 1000).toLocaleString() ])
        : text('status.inactive', 'There is no raid going on');

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-raid-protection" frameStyle={ 3 } isResizable={ false } theme="primary-slim" uniqueKey="raid-protection-settings">
                <OctaneCardHeaderView headerText={ text('title', 'Raid protection') } onCloseClick={ close } />
                <OctaneCardContentView className="octane-raid-protection__content" overflow="hidden">
                    <div className="octane-raid-protection__advice">
                        { text('warning', 'Switch this on when you expect an unwanted raid. Start busy games or events with a lower sensitivity.') }
                    </div>
                    <div className="octane-raid-protection__card is-protection">
                        <label className="octane-raid-protection__toggle">
                            <Checkbox aria-label={ text('enabled', 'Turn on raid protection') } checked={ form.enabled } onCheckedChange={ checked => update({ enabled: checked }) } />
                            <span>{ text('enabled', 'Turn on raid protection') }</span>
                        </label>
                        <div className="octane-raid-protection__separator" />
                        <div className="octane-raid-protection__controls" data-disabled={ protectionDisabled || undefined }>
                            <div className="octane-raid-protection__row">
                                <span>{ text('detection.label', 'Sensitivity') }</span>
                                <UbuntuDropmenuView disabled={ protectionDisabled } label={ text('detection.label', 'Sensitivity') } options={ sensitivityOptions() } value={ form.sensitivity } onSelect={ value => update({ sensitivity: Number(value) }) } />
                            </div>
                            <div className="octane-raid-protection__row">
                                <span>{ text('action.label', 'When a raid is detected') }</span>
                                <UbuntuDropmenuView
                                    disabled={ protectionDisabled }
                                    label={ text('action.label', 'When a raid is detected') }
                                    options={ [
                                        { value: 0, label: text('action.kick', 'Kick the player out of the room') },
                                        { value: 1, label: text('action.temporary_ban', 'Temporary ban') }
                                    ] }
                                    value={ form.actionType }
                                    onSelect={ value => update({ actionType: Number(value) }) } />
                            </div>
                            <div className="octane-raid-protection__row" data-disabled={ banDisabled || undefined }>
                                <span>{ text('ban_duration', 'Ban length') }</span>
                                <UbuntuDropmenuView disabled={ banDisabled } label={ text('ban_duration', 'Ban length') } options={ durationOptions(RAID_PROTECTION_BAN_DURATIONS) } value={ form.banDurationSeconds } onSelect={ value => update({ banDurationSeconds: Number(value) }) } />
                            </div>
                        </div>
                    </div>
                    <div className="octane-raid-protection__card is-guard">
                        <label className="octane-raid-protection__toggle">
                            <Checkbox aria-label={ text('guard.enabled', 'Keep suspicious players out during a raid') } checked={ form.guardEnabled } onCheckedChange={ checked => update({ guardEnabled: checked }) } />
                            <span>{ text('guard.enabled', 'Keep suspicious players out during a raid') }</span>
                        </label>
                        <div className="octane-raid-protection__description">
                            { text('guard.description', 'During a raid suspicious players can be kept out of the room as well') }
                        </div>
                        <div className="octane-raid-protection__controls" data-disabled={ guardDisabled || undefined }>
                            <div className="octane-raid-protection__row">
                                <span>{ text('guard.duration', 'Keep players out for') }</span>
                                <UbuntuDropmenuView disabled={ guardDisabled } label={ text('guard.duration', 'Keep players out for') } options={ durationOptions(RAID_PROTECTION_GUARD_DURATIONS) } value={ form.guardDurationSeconds } onSelect={ value => update({ guardDurationSeconds: Number(value) }) } />
                            </div>
                            <div className="octane-raid-protection__row">
                                <span>{ text('guard.sensitivity', 'How strict should this be?') }</span>
                                <UbuntuDropmenuView disabled={ guardDisabled } label={ text('guard.sensitivity', 'How strict should this be?') } options={ sensitivityOptions() } value={ form.guardSensitivity } onSelect={ value => update({ guardSensitivity: Number(value) }) } />
                            </div>
                        </div>
                    </div>
                    <div className="octane-raid-protection__status" role="status">
                        { settings.incidentActive
                            ? <strong className="is-active">{ text('status.active', 'A raid is going on right now') }</strong>
                            : <span>{ inactiveText }</span> }
                    </div>
                    <div className="octane-raid-protection__actions">
                        <BaseButton className="octane-raid-protection__button is-cancel" type="button" onClick={ close }>
                            { text('cancel', 'Cancel') }
                        </BaseButton>
                        <BaseButton className="octane-raid-protection__button is-save" disabled={ busy } type="button" onClick={ save }>
                            { text('save', 'Save') }
                        </BaseButton>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
