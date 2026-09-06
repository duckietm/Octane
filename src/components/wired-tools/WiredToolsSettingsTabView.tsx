import { FC } from 'react';
import { LocalizeText, localizeWithFallback, normalizeWiredStyle, WIRED_STYLE_DEFAULT, WIRED_STYLE_OPTIONS, wiredStyleTitle } from '../../api';
import { Button, Text } from '../../common';
import { useNotification, useRoom, useWiredTools } from '../../hooks';

const WIRED_ACCESS_EVERYONE = 1;
const WIRED_ACCESS_USERS_WITH_RIGHTS = 2;
const WIRED_ACCESS_GROUP_MEMBERS = 4;
const WIRED_ACCESS_GROUP_ADMINS = 8;

interface RoomAccessOption {
    bit: number;
    label: string;
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

export const WiredToolsSettingsTabView: FC<{}> = () => {
    const { roomSession = null } = useRoom();
    const { showConfirm = null } = useNotification();
    const { accountPreferences, roomSettings, saveRoomSettings, updateAccountPreferences } = useWiredTools();

    const canManageSettings = roomSettings.canManageSettings;
    const canReloadRoom = !!roomSession?.isRoomOwner;
    const inspectOptions = buildInspectOptions();
    const modifyOptions = buildModifyOptions();
    const serverTimeZone = roomSession?.hotelTimeZone || 'UTC';

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

    const renderAccessOption = (option: RoomAccessOption, mask: number, onToggle: (bit: number) => void) => {
        const checked = (mask & option.bit) !== 0;
        const disabled = !roomSettings.isLoaded || !canManageSettings;

        return (
            <label key={option.label} className={`flex items-center gap-2 text-[12px] ${disabled ? 'text-[#8c877d]' : 'text-[#222]'}`}>
                <input checked={checked} className="form-check-input mt-0" disabled={disabled} type="checkbox" onChange={() => onToggle(option.bit)} />
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
                        className="w-full rounded border border-[#9d998e] bg-[#f4f0e8] px-2 py-[6px] text-[12px] text-[#555]"
                        disabled
                        value={serverTimeZone}
                    >
                        <option value={serverTimeZone}>{serverTimeZone}</option>
                    </select>
                </div>
                <div className="rounded bg-[#dfddd7] p-3 flex flex-col gap-2">
                    <Text bold small>
                        Room state:
                    </Text>
                    <div className="flex gap-2">
                        <Button
                            classNames={['flex-1']}
                            disabled={!canReloadRoom}
                            variant="secondary"
                            onClick={() =>
                                showConfirm(
                                    LocalizeText('wiredmenu.settings.room_state.reload.warning'),
                                    () => roomSession?.sendChatMessage(':reload', 0, ''),
                                    null,
                                    LocalizeText('generic.ok'),
                                    LocalizeText('generic.cancel'),
                                    LocalizeText('generic.alert.title')
                                )
                            }
                        >
                            Reload
                        </Button>
                        <Button classNames={['flex-1']} disabled variant="danger">
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
                        <input
                            checked={accountPreferences.showToolbarButton}
                            className="form-check-input mt-0"
                            type="checkbox"
                            onChange={(event) => updateAccountPreferences({ showToolbarButton: event.target.checked })}
                        />
                        <span>Show wired menu in toolbar</span>
                    </label>
                    <label className="flex items-center gap-2 text-[12px] text-[#222]">
                        <input
                            checked={accountPreferences.showInspectButton}
                            className="form-check-input mt-0"
                            type="checkbox"
                            onChange={(event) => updateAccountPreferences({ showInspectButton: event.target.checked })}
                        />
                        <span>Furni/user inspect button</span>
                    </label>
                    <label className="flex items-center gap-2 text-[12px] text-[#222]">
                        <input
                            checked={accountPreferences.showSystemNotifications}
                            className="form-check-input mt-0"
                            type="checkbox"
                            onChange={(event) => updateAccountPreferences({ showSystemNotifications: event.target.checked })}
                        />
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
        </div>
    );
};
