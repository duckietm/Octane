import { describe, expect, it } from 'vitest';
import { findTemplateById, HK_SANCTION_TEMPLATES, HousekeepingSanctionType, resolveSanctionTemplates, templatesByType } from './HousekeepingSanctionTemplates';

describe('HK_SANCTION_TEMPLATES', () => {
    it('has a unique id for every template', () => {
        const ids = HK_SANCTION_TEMPLATES.map((t) => t.id);
        const unique = new Set(ids);

        expect(unique.size).toBe(ids.length);
    });

    it('covers every sanction type at least once', () => {
        const types = new Set(HK_SANCTION_TEMPLATES.map((t) => t.type));

        expect(types.has(HousekeepingSanctionType.BAN)).toBe(true);
        expect(types.has(HousekeepingSanctionType.MUTE)).toBe(true);
        expect(types.has(HousekeepingSanctionType.KICK)).toBe(true);
        expect(types.has(HousekeepingSanctionType.TRADE_LOCK)).toBe(true);
    });

    it('uses durationValue=0 for KICK templates only (kick is instant, no duration)', () => {
        for (const template of HK_SANCTION_TEMPLATES) {
            if (template.type === HousekeepingSanctionType.KICK) expect(template.durationValue).toBe(0);
            else expect(template.durationValue).toBeGreaterThan(0);
        }
    });

    it('every template has a non-empty default reason (avoids empty-reason validation failures)', () => {
        for (const template of HK_SANCTION_TEMPLATES) {
            expect(template.defaultReason.trim().length).toBeGreaterThan(0);
        }
    });
});

describe('findTemplateById', () => {
    it('returns the matching template', () => {
        expect(findTemplateById('ban_24h')?.type).toBe(HousekeepingSanctionType.BAN);
        expect(findTemplateById('ban_24h')?.durationValue).toBe(24);
    });

    it('returns null for an unknown id', () => {
        expect(findTemplateById('does-not-exist')).toBeNull();
        expect(findTemplateById('')).toBeNull();
    });
});

describe('templatesByType', () => {
    it('filters the list down to a single type', () => {
        const bans = templatesByType(HousekeepingSanctionType.BAN);

        expect(bans.length).toBeGreaterThan(0);
        expect(bans.every((t) => t.type === HousekeepingSanctionType.BAN)).toBe(true);
    });

    it('returns an empty list for unknown types (defensive)', () => {
        expect(templatesByType('unknown' as never)).toEqual([]);
    });
});

describe('resolveSanctionTemplates', () => {
    it('falls back to the defaults for a missing or invalid value', () => {
        expect(resolveSanctionTemplates(undefined)).toBe(HK_SANCTION_TEMPLATES);
        expect(resolveSanctionTemplates('nope')).toBe(HK_SANCTION_TEMPLATES);
        expect(resolveSanctionTemplates([{ id: 'x', type: 'unknown', durationValue: 1 }])).toBe(HK_SANCTION_TEMPLATES);
    });

    it('keeps valid configured entries and drops duplicates and bad durations', () => {
        const templates = resolveSanctionTemplates([
            { id: 'spam', type: 'mute', durationValue: 15, defaultReason: 'Spam' },
            { id: 'spam', type: 'ban', durationValue: 1 },
            { id: 'kick_bad', type: 'kick', durationValue: 5 },
            { id: 'ban_bad', type: 'ban', durationValue: 0 },
            { id: 'go', type: 'kick', durationValue: 0 }
        ]);

        expect(templates.map((t) => t.id)).toEqual(['spam', 'go']);
        expect(templates[0]).toMatchObject({ type: HousekeepingSanctionType.MUTE, durationValue: 15, defaultReason: 'Spam', name: 'spam' });
    });
});
