/**
 * AIR navigator/raidprotection (RaidProtectionSettingsController / RaidProtectionSettingsView): the
 * value lists the window offers, AIR's validity check and the link that opens it.
 */
export const RAID_PROTECTION_SENSITIVITIES = [ 0, 1, 2 ] as const;
export const RAID_PROTECTION_ACTIONS = [ 0, 1 ] as const;
export const RAID_PROTECTION_BAN_DURATIONS = [ 300, 900, 1800, 3600, 10800, 21600, 43200, 86400, 259200, 604800 ] as const;
export const RAID_PROTECTION_GUARD_DURATIONS = [ 300, 900, 1800, 3600, 10800 ] as const;

export const RAID_PROTECTION_ACTION_KICK = 0;
export const RAID_PROTECTION_ACTION_TEMPORARY_BAN = 1;

export const RAID_PROTECTION_SENSITIVITY_KEYS = [ 'low', 'medium', 'high' ] as const;
export const RAID_PROTECTION_SENSITIVITY_FALLBACKS = [ 'Low', 'Medium', 'High' ] as const;

/** English fallbacks of raid.protection.settings.duration.<seconds>. */
export const RAID_PROTECTION_DURATION_FALLBACKS: Readonly<Record<number, string>> = {
    300: '5 minutes',
    900: '15 minutes',
    1800: '30 minutes',
    3600: '1 hour',
    10800: '3 hours',
    21600: '6 hours',
    43200: '12 hours',
    86400: '1 day',
    259200: '3 days',
    604800: '1 week'
};

/** The editable part of AIR's RaidProtectionSettingsData. */
export interface IRaidProtectionEditable
{
    roomId: number;
    enabled: boolean;
    sensitivity: number;
    actionType: number;
    banDurationSeconds: number;
    guardEnabled: boolean;
    guardDurationSeconds: number;
    guardSensitivity: number;
}

export interface IRaidProtectionSettings extends IRaidProtectionEditable
{
    incidentActive: boolean;
    lastRaidAtEpochSeconds: number;
}

const has = (values: readonly number[], value: number) => values.indexOf(value) !== -1;

/** AIR RaidProtectionSettingsController.valid. */
export const isValidRaidProtectionSettings = (settings: IRaidProtectionEditable | null): boolean =>
    !!settings &&
    has(RAID_PROTECTION_SENSITIVITIES, settings.sensitivity) &&
    has(RAID_PROTECTION_ACTIONS, settings.actionType) &&
    has(RAID_PROTECTION_BAN_DURATIONS, settings.banDurationSeconds) &&
    has(RAID_PROTECTION_GUARD_DURATIONS, settings.guardDurationSeconds) &&
    has(RAID_PROTECTION_SENSITIVITIES, settings.guardSensitivity);

/** AIR RaidProtectionSettingsData.matchesEditable. */
export const raidProtectionMatchesEditable = (a: IRaidProtectionEditable | null, b: IRaidProtectionEditable | null): boolean =>
    !!a &&
    !!b &&
    a.enabled === b.enabled &&
    a.sensitivity === b.sensitivity &&
    a.actionType === b.actionType &&
    a.banDurationSeconds === b.banDurationSeconds &&
    a.guardEnabled === b.guardEnabled &&
    a.guardDurationSeconds === b.guardDurationSeconds &&
    a.guardSensitivity === b.guardSensitivity;

/**
 * The room id of a navigator/raidprotection/&lt;id&gt; link, as AIR's handler accepts it: digits only,
 * 1 up to the int maximum. Null otherwise.
 */
export const parseRaidProtectionLinkRoomId = (value: string | null | undefined): number | null =>
{
    if(value === null || value === undefined || !/^\d+$/.test(value)) return null;

    const roomId = Number(value);

    if(roomId <= 0 || roomId > 2147483647) return null;

    return Math.trunc(roomId);
};

/** AIR's save switches protection on only after the owner confirms (controller.requestSave). */
export const raidProtectionNeedsConfirmation = (stored: IRaidProtectionEditable | null, requested: IRaidProtectionEditable | null): boolean =>
    !!stored && !!requested && !stored.enabled && requested.enabled;

/** The text key of a save result: 0 saved, 1-6 raid.protection.settings.save.fail.N. */
export const raidProtectionSaveResultKey = (resultCode: number): string =>
    resultCode === 0 ? 'raid.protection.settings.save.success' : `raid.protection.settings.save.fail.${ resultCode }`;
