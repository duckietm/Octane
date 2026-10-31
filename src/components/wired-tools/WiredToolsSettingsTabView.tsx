import { FC, useMemo } from 'react';
import {
    GetConfigurationValue,
    LocalizeText,
    localizeWithFallback,
    normalizeWiredStyle,
    WIRED_STYLE_DEFAULT,
    WIRED_STYLE_OPTIONS,
    wiredStyleTitle
} from '../../api';
import { NotificationConfirmItem } from '../../api/notification/NotificationConfirmItem';
import { Button, Text } from '../../common';
import { useNotification, useRoom, useWiredTools } from '../../hooks';
import { Checkbox } from '../../common/Checkbox';
import { Select } from '../../common/Select';
import { buildTimezoneOptions } from '../../api/wired/WiredTimezones';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

const WIRED_ACCESS_EVERYONE = 1;
const WIRED_ACCESS_USERS_WITH_RIGHTS = 2;
const WIRED_ACCESS_GROUP_MEMBERS = 4;
const WIRED_ACCESS_GROUP_ADMINS = 8;

interface RoomAccessOption {
    bit: number;
    label: string;
}

export interface WiredToolsSettingsTabViewProps {
    /** Opens the sandbox self-donation tool; the button shows when `wired.selfdonation.enabled` is on. */
    onOpenSelfDonation?: () => void;
}

const toggleMaskBit = (mask: number, bit: number): number => (mask & bit ? mask & ~bit : mask | bit);
const normalizeAccessMask = (mask: number): number => ((mask & WIRED_ACCESS_GROUP_MEMBERS) !== 0 ? mask | WIRED_ACCESS_GROUP_ADMINS : mask);

/**
 * Official WiredMenuSettingsTab: one checkbox per room controller level, bit `1 << level`, labelled
 * `wiredmenu.settings.permission_level.<level>` (0 everyone, 1 rights, 2 group members, 3 group admins).
 */
const permissionOption = (bit: number, fallback: string): RoomAccessOption => ({
    bit,
    label: localizeWithFallback(`wiredmenu.settings.permission_level.${Math.log2(bit)}`, fallback)
});

const buildInspectOptions = (): RoomAccessOption[] => [
    permissionOption(WIRED_ACCESS_EVERYONE, 'Everyone'),
    permissionOption(WIRED_ACCESS_USERS_WITH_RIGHTS, 'Users with rights'),
    permissionOption(WIRED_ACCESS_GROUP_MEMBERS, 'Group members'),
    permissionOption(WIRED_ACCESS_GROUP_ADMINS, 'Group admins')
];

const buildModifyOptions = (): RoomAccessOption[] => [
    permissionOption(WIRED_ACCESS_USERS_WITH_RIGHTS, 'Users with rights'),
    permissionOption(WIRED_ACCESS_GROUP_MEMBERS, 'Group members'),
    permissionOption(WIRED_ACCESS_GROUP_ADMINS, 'Group admins')
];

// The list lives with the wired api so the time / date conditions offer the same zones.
export { buildTimezoneOptions };

export const WiredToolsSettingsTabView: FC<WiredToolsSettingsTabViewProps> = ({ onOpenSelfDonation = null }) => {
    const { roomSession = null } = useRoom();
    const { showConfirm = null } = useNotification();
    const { accountPreferences, roomSettings, saveRoomSettings, saveRoomTimezone, reloadRoomWired, rollbackRoomWired, setPlayTestMode, updateAccountPreferences } =
        useWiredTools();

    const canManageSettings = roomSettings.canManageSettings;
    const canChangeRoomState = roomSettings.isLoaded && roomSettings.canModify;
    const inspectOptions = buildInspectOptions();
    const modifyOptions = buildModifyOptions();
    const serverTimeZone = roomSession?.hotelTimeZone || 'UTC';
    const selectedTimeZone = roomSettings.timezone || serverTimeZone;
    const timezoneOptions = useMemo(
        () => buildTimezoneOptions(selectedTimeZone, serverTimeZone, GetConfigurationValue<string>('wired.timezones', '')),
        [selectedTimeZone, serverTimeZone]
    );
    const showSelfDonation = !!onOpenSelfDonation && GetConfigurationValue<boolean>('wired.selfdonation.enabled', false);

    const updateInspectMask = (bit: number) => {
        if (!canManageSettings) return;

        saveRoomSettings(normalizeAccessMask(toggleMaskBit(roomSettings.inspectMask, bit)), roomSettings.modifyMask);
    };

    const updateModifyMask = (bit: number) => {
        if (!canManageSettings) return;

        const nextModifyMask = toggleMaskBit(roomSettings.modifyMask, bit);
        const enabledModifyBit = (nextModifyMask & bit) !== 0;
        const normalizedModifyMask = normalizeAccessMask(nextModifyMask);
        const nextInspectMask = normalizeAccessMask(enabledModifyBit ? roomSettings.inspectMask | bit : roomSettings.inspectMask);

        saveRoomSettings(nextInspectMask, normalizedModifyMask);
    };

    // Official: reload goes at once; roll back asks first, titled by its own button.
    const reloadRoomState = () => {
        if (!canChangeRoomState) return;

        reloadRoomWired();
    };

    const rollbackRoomState = () => {
        if (!canChangeRoomState) return;

        if (!showConfirm) {
            rollbackRoomWired();
            return;
        }

        showConfirm(
            localizeWithFallback(
                'wiredmenu.settings.room_state.roll_back.warning',
                'Roll back the wired of this room? Every box is re-read from storage and edits that were never saved are lost.'
            ),
            rollbackRoomWired,
            null,
            LocalizeText('generic.ok'),
            LocalizeText('generic.cancel'),
            localizeWithFallback('wiredmenu.settings.room_state.roll_back', 'Rollback'),
            null,
            NotificationConfirmItem.TITLE_BAR_DANGER
        );
    };

    const renderAccessOption = (option: RoomAccessOption, mask: number, onToggle: (bit: number) => void) => {
        const checked = (mask & option.bit) !== 0;
        const disabled = !roomSettings.isLoaded || !canManageSettings;

        return (
            <label key={option.label} className={`flex items-center gap-2 text-[12px] ${disabled ? 'text-[#8c877d]' : 'text-[#222]'}`}>
                <Checkbox checked={checked} className="mt-0" disabled={disabled} onCheckedChange={() => onToggle(option.bit)} />
                <span>{option.label}</span>
            </label>
        );
    };

    return (
        <NativeTextTree>
            <div className="p-3 min-h-[360px] flex flex-col gap-3">
                <Text bold>{localizeWithFallback('wiredmenu.settings.room_settings', 'Room settings:')}</Text>
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                        <Text bold small>
                            {localizeWithFallback('wiredmenu.settings.room_settings.modify_rights', 'Who can modify Wired:')}
                        </Text>
                        {modifyOptions.map((option) => renderAccessOption(option, roomSettings.modifyMask, updateModifyMask))}
                    </div>
                    <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                        <Text bold small>
                            {localizeWithFallback('wiredmenu.settings.room_settings.read_rights', 'Who can inspect Wired:')}
                        </Text>
                        {inspectOptions.map((option) => renderAccessOption(option, roomSettings.inspectMask, updateInspectMask))}
                    </div>
                    <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                        <Text bold small>
                            {localizeWithFallback('wiredmenu.settings.room_settings.timezone', 'Timezone:')}
                        </Text>
                        <Select
                            aria-label="Timezone"
                            className="w-full rounded border border-[#9d998e] bg-[#f4f0e8] px-2 py-[6px] text-[12px] text-[#555] disabled:opacity-70"
                            disabled={!roomSettings.isLoaded || !canManageSettings}
                            value={selectedTimeZone}
                            onChange={(event) => saveRoomTimezone(event.target.value)}
                        >
                            {timezoneOptions.map((zone) => (
                                <option key={zone} value={zone}>
                                    {zone === serverTimeZone ? `${zone} (hotel)` : zone}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                        <Text bold small>
                            {localizeWithFallback('wiredmenu.settings.room_settings.room_state', 'Room state:')}
                        </Text>
                        <div className="flex gap-2">
                            <Button
                                classNames={['flex-1']}
                                disabled={!canChangeRoomState}
                                variant="secondary"
                                onClick={reloadRoomState}
                            >
                                {localizeWithFallback('wiredmenu.settings.room_state.reload', 'Reload')}
                            </Button>
                            <Button
                                classNames={['flex-1', 'octane-wired-menu__roll-back']}
                                disabled={!canChangeRoomState}
                                variant="danger"
                                onClick={rollbackRoomState}
                            >
                                {localizeWithFallback('wiredmenu.settings.room_state.roll_back', 'Rollback')}
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <Text bold>{localizeWithFallback('wiredmenu.settings.preferences', 'Account preferences:')}</Text>
                    <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                        <Text bold small>
                            {localizeWithFallback('wiredmenu.settings.preferences.general', 'General:')}
                        </Text>
                        <label className="flex items-center gap-2 text-[12px] text-[#222]">
                            <Checkbox checked={accountPreferences.showToolbarButton} className="mt-0" onCheckedChange={(nextChecked) => updateAccountPreferences({ showToolbarButton: nextChecked })} />
                            <span>{localizeWithFallback('wiredmenu.settings.preferences.toolbar', 'Show wired menu in toolbar')}</span>
                        </label>
                        <label className="flex items-center gap-2 text-[12px] text-[#222]">
                            <Checkbox checked={accountPreferences.showInspectButton} className="mt-0" onCheckedChange={(nextChecked) => updateAccountPreferences({ showInspectButton: nextChecked })} />
                            <span>{localizeWithFallback('wiredmenu.settings.preferences.inspect_button', 'Furni/user inspect button')}</span>
                        </label>
                        <label className="flex items-center gap-2 text-[12px] text-[#222]">
                            <Checkbox checked={accountPreferences.playTestMode} className="mt-0" onCheckedChange={(nextChecked) => setPlayTestMode(nextChecked)} />
                            <span>{localizeWithFallback('wiredmenu.settings.preferences.playtest', 'Enable playtesting mode')}</span>
                        </label>
                        <label className="flex items-center gap-2 text-[12px] text-[#222]">
                            <Checkbox checked={accountPreferences.showSystemNotifications} className="mt-0" onCheckedChange={(nextChecked) => updateAccountPreferences({ showSystemNotifications: nextChecked })} />
                            <span>{localizeWithFallback('wiredmenu.settings.preferences.show_all_errors', 'Show all system notifications')}</span>
                        </label>
                        <label className="flex items-center gap-2 text-[12px] text-[#222]">
                            <span>{localizeWithFallback('wiredmenu.settings.preferences.wired_style', 'Wired UI style:')}</span>
                            <Select
                                className="form-select form-select-sm"
                                value={accountPreferences.wiredStyle}
                                onChange={(event) => updateAccountPreferences({ wiredStyle: normalizeWiredStyle(event.target.value) })}
                            >
                                {/* Official: "Default (Illumina)" first, stored as "", then the selectable styles. */}
                                {[WIRED_STYLE_DEFAULT, ...WIRED_STYLE_OPTIONS].map((style) => (
                                    <option key={style || 'default'} value={style}>
                                        {style === WIRED_STYLE_DEFAULT
                                            ? localizeWithFallback('wiredmenu.settings.preferences.wired_style.default', 'Default (%name%)', ['name'], [wiredStyleTitle('illumina')])
                                            : wiredStyleTitle(style)}
                                    </option>
                                ))}
                            </Select>
                        </label>
                    </div>
                </div>
                {showSelfDonation && (
                    <div className="flex flex-col gap-2">
                        <Text bold>{localizeWithFallback('selfdonation.section', 'Sandbox tools:')}</Text>
                        <div className="rounded bg-[#dfddd7] p-3 flex items-center justify-between gap-3">
                            <Text small>{localizeWithFallback('selfdonation.info', 'Give yourself furni to test wired with. Only staff with the sandbox permission can use it.')}</Text>
                            <Button variant="secondary" onClick={onOpenSelfDonation}>
                                {localizeWithFallback('selfdonation.title', 'Sandbox donation tool')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
