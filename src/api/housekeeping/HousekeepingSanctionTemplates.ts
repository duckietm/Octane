export const HousekeepingSanctionType = {
    BAN: 'ban',
    MUTE: 'mute',
    KICK: 'kick',
    TRADE_LOCK: 'trade_lock'
} as const;

export type HousekeepingSanctionType = (typeof HousekeepingSanctionType)[keyof typeof HousekeepingSanctionType];

export interface HousekeepingSanctionTemplate {
    id: string;
    /** Display name (LocalizeText key OR plain label fallback). */
    name: string;
    type: HousekeepingSanctionType;
    /** Duration in hours for BAN / TRADE_LOCK, minutes for MUTE; ignored for KICK. */
    durationValue: number;
    /** Pre-canned reason - overridable from the UI textarea. */
    defaultReason: string;
}

/**
 * Pre-canned sanction shortcuts. Lifted from the shape of mod-tools'
 * `MOD_ACTION_DEFINITIONS` (see `ModActionDefinition.ts`) but
 * simplified - HK doesn't need the CFH topic / sanctionTypeId
 * indirection because the HK HTTP API takes plain `(userId, reason,
 * duration)` triples.
 *
 * Operators that need different presets can mirror this file and
 * inject through the UI config layer down the road; for now keep
 * a flat default set covering the common cases.
 */
export const HK_SANCTION_TEMPLATES: HousekeepingSanctionTemplate[] = [
    { id: 'kick', name: 'Kick', type: HousekeepingSanctionType.KICK, durationValue: 0, defaultReason: 'Removed from session' },
    { id: 'mute_5m', name: 'Mute 5m', type: HousekeepingSanctionType.MUTE, durationValue: 5, defaultReason: 'Cool down - chat flood' },
    { id: 'mute_60m', name: 'Mute 60m', type: HousekeepingSanctionType.MUTE, durationValue: 60, defaultReason: 'Mute - repeat offender' },
    { id: 'ban_1h', name: 'Ban 1h', type: HousekeepingSanctionType.BAN, durationValue: 1, defaultReason: 'Temporary ban - rule violation' },
    { id: 'ban_24h', name: 'Ban 24h', type: HousekeepingSanctionType.BAN, durationValue: 24, defaultReason: '24h ban - rule violation' },
    { id: 'ban_7d', name: 'Ban 7d', type: HousekeepingSanctionType.BAN, durationValue: 168, defaultReason: '7-day ban - serious violation' },
    { id: 'ban_30d', name: 'Ban 30d', type: HousekeepingSanctionType.BAN, durationValue: 720, defaultReason: '30-day ban - final warning' },
    { id: 'ban_perm', name: 'Ban permanent', type: HousekeepingSanctionType.BAN, durationValue: 24 * 365 * 100, defaultReason: 'Permanent ban' },
    { id: 'tlock_7d', name: 'Trade lock 7d', type: HousekeepingSanctionType.TRADE_LOCK, durationValue: 168, defaultReason: 'Trade lock - suspected scam' },
    {
        id: 'tlock_perm',
        name: 'Trade lock perm',
        type: HousekeepingSanctionType.TRADE_LOCK,
        durationValue: 24 * 365 * 100,
        defaultReason: 'Permanent trade lock'
    }
];

export const findTemplateById = (id: string, templates: HousekeepingSanctionTemplate[] = HK_SANCTION_TEMPLATES): HousekeepingSanctionTemplate | null =>
    templates.find((t) => t.id === id) ?? null;

export const templatesByType = (type: HousekeepingSanctionType): HousekeepingSanctionTemplate[] => HK_SANCTION_TEMPLATES.filter((t) => t.type === type);

const SANCTION_TYPES = new Set<string>(Object.values(HousekeepingSanctionType));

/**
 * The templates a hotel configured under `housekeeping.sanction_templates`,
 * or the defaults when the value is missing or none of its entries is valid.
 * An entry needs a unique id, a known type and a duration (0 for a kick);
 * name and reason are optional because the text files translate them by id.
 */
export const resolveSanctionTemplates = (configured: unknown): HousekeepingSanctionTemplate[] => {
    if (!Array.isArray(configured)) return HK_SANCTION_TEMPLATES;

    const seen = new Set<string>();
    const templates: HousekeepingSanctionTemplate[] = [];

    for (const raw of configured) {
        if (!raw || typeof raw !== 'object') continue;

        const entry = raw as Partial<HousekeepingSanctionTemplate>;
        const id = typeof entry.id === 'string' ? entry.id.trim() : '';
        const type = entry.type as HousekeepingSanctionType;
        const duration = Number(entry.durationValue);

        if (!id || seen.has(id) || !SANCTION_TYPES.has(type) || !Number.isInteger(duration)) continue;
        if (type === HousekeepingSanctionType.KICK ? duration !== 0 : duration <= 0) continue;

        seen.add(id);
        templates.push({
            id,
            type,
            durationValue: duration,
            name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : id,
            defaultReason: typeof entry.defaultReason === 'string' && entry.defaultReason.trim() ? entry.defaultReason.trim() : id
        });
    }

    return templates.length ? templates : HK_SANCTION_TEMPLATES;
};
