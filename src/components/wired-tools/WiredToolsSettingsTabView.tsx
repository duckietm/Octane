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
import { Button, Text } from '../../common';
import { useNotification, useRoom, useWiredTools } from '../../hooks';
import { Checkbox } from '../../common/Checkbox';

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

const buildInspectOptions = (): RoomAccessOption[] => [
    { bit: WIRED_ACCESS_EVERYONE, label: 'Everyone' },
    { bit: WIRED_ACCESS_USERS_WITH_RIGHTS, label: 'Users with rights' },
    { bit: WIRED_ACCESS_GROUP_MEMBERS, label: 'Group members' },
    { bit: WIRED_ACCESS_GROUP_ADMINS, label: 'Group admins' }
];

const buildModifyOptions = (): RoomAccessOption[] => [
    { bit: WIRED_ACCESS_USERS_WITH_RIGHTS, label: 'Users with rights' },
    { bit: WIRED_ACCESS_GROUP_MEMBERS, label: 'Group members' },
    { bit: WIRED_ACCESS_GROUP_ADMINS, label: 'Group admins' }
];

/**
 * The timezones the room can pick: the hotel's own list from `wired.timezones` (comma separated)
 * when it has one, otherwise everything the browser knows, with the room's current zone and the
 * hotel's server zone always present.
 */
export const buildTimezoneOptions = (current: string, hotelZone: string, configured: string): string[] => {
    const zones: string[] = [];
    const add = (zone: string) => {
        const trimmed = (zone || '').trim();

        if (trimmed && !zones.includes(trimmed)) zones.push(trimmed);
    };

    add(current);
    add(hotelZone);

    const fromConfig = (configured || '')
        .split(',')
        .map((zone) => zone.trim())
        .filter(Boolean);

    if (fromConfig.length) {
        fromConfig.forEach(add);
    } else {
        try {
            const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];

            supported.forEach(add);
        } catch {
            // An older browser without the list still offers the zones it was given.
        }
    }

    add('UTC');

    return zones;
};

export const WiredToolsSettingsTabView: FC<WiredToolsSettingsTabViewProps> = ({ onOpenSelfDonation = null }) => {
    const { roomSession = null } = useRoom();
    const { showConfirm = null } = useNotification();
    const { accountPreferences, roomSettings, saveRoomSettings, saveRoomTimezone, reloadRoomWired, rollbackRoomWired, updateAccountPreferences } =
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

    const confirmRoomState = (messageKey: string, fallback: string, action: () => void) => {
        if (!canChangeRoomState) return;

        if (!showConfirm) {
            action();
            return;
        }

        showConfirm(
            localizeWithFallback(messageKey, fallback),
            action,
            null,
            LocalizeText('generic.ok'),
            LocalizeText('generic.cancel'),
            LocalizeText('generic.alert.title')
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
        <div className="p-3 min-h-[360px] flex flex-col gap-3">
            <Text bold>Room settings:</Text>
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                    <Text bold small>
                        Who can modify Wired:
                    </Text>
                    {modifyOptions.map((option) => renderAccessOption(option, roomSettings.modifyMask, updateModifyMask))}
                </div>
                <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                    <Text bold small>
                        Who can inspect Wired:
                    </Text>
                    {inspectOptions.map((option) => renderAccessOption(option, roomSettings.inspectMask, updateInspectMask))}
                </div>
                <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                    <Text bold small>
                        Timezone:
                    </Text>
                    <select
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
                    </select>
                </div>
                <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                    <Text bold small>
                        Room state:
                    </Text>
                    <div className="flex gap-2">
                        <Button
                            classNames={['flex-1']}
                            disabled={!canChangeRoomState}
                            variant="secondary"
                            onClick={() =>
                                confirmRoomState(
                                    'wiredmenu.settings.room_state.reload.warning',
                                    'Reload the wired of this room? Every box is wired up again from the furniture as it stands now.',
                                    reloadRoomWired
                                )
                            }
                        >
                            Reload
                        </Button>
                        <Button
                            classNames={['flex-1']}
                            disabled={!canChangeRoomState}
                            variant="danger"
                            onClick={() =>
                                confirmRoomState(
                                    'wiredmenu.settings.room_state.rollback.warning',
                                    'Roll back the wired of this room? Every box is re-read from storage and edits that were never saved are lost.',
                                    rollbackRoomWired
                                )
                            }
                        >
                            Rollback
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <Text bold>Account preferences:</Text>
                <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                    <Text bold small>
                        General:
                    </Text>
                    <label className="flex items-center gap-2 text-[12px] text-[#222]">
                        <Checkbox checked={accountPreferences.showToolbarButton} className="mt-0" onCheckedChange={(nextChecked) => updateAccountPreferences({ showToolbarButton: nextChecked })} />
                        <span>Show wired menu in toolbar</span>
                    </label>
                    <label className="flex items-center gap-2 text-[12px] text-[#222]">
                        <Checkbox checked={accountPreferences.showInspectButton} className="mt-0" onCheckedChange={(nextChecked) => updateAccountPreferences({ showInspectButton: nextChecked })} />
                        <span>Furni/user inspect button</span>
                    </label>
                    <label className="flex items-center gap-2 text-[12px] text-[#222]">
                        <Checkbox checked={accountPreferences.showSystemNotifications} className="mt-0" onCheckedChange={(nextChecked) => updateAccountPreferences({ showSystemNotifications: nextChecked })} />
                        <span>Show all system notifications</span>
                    </label>
                    <label className="flex items-center gap-2 text-[12px] text-[#222]">
                        <span>{localizeWithFallback('wiredmenu.settings.preferences.wired_style', 'Wired style:')}</span>
                        <select
                            className="form-select form-select-sm"
                            value={accountPreferences.wiredStyle}
                            onChange={(event) => updateAccountPreferences({ wiredStyle: normalizeWiredStyle(event.target.value) })}
                        >
                            {WIRED_STYLE_OPTIONS.map((style) => (
                                <option key={style} value={style}>
                                    {style === WIRED_STYLE_DEFAULT
                                        ? localizeWithFallback('wiredmenu.settings.preferences.wired_style.default', 'Default (%name%)', ['name'], ['Octane'])
                                        : wiredStyleTitle(style)}
                                </option>
                            ))}
                        </select>
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
    );
};
