import { describe, expect, it } from 'vitest';
import { WiredSelectorLayoutCode } from './WiredSelectorLayoutCode';

// The official AIR client's SelectorCodes (build WIN63-202610131318).
const OFFICIAL: Record<string, number> = {
    FURNI_BY_TYPE: 0,
    FURNI_PICKS: 1,
    USERS_BY_TYPE: 2,
    USERS_IN_TEAM: 3,
    FURNI_ON_FURNI: 4,
    FURNI_FROM_SIGNAL: 5,
    FURNI_NEIGHBORHOOD: 6,
    FURNI_IN_AREA: 7,
    USERS_ON_FURNI: 8,
    USERS_PERFORMING_ACTION: 9,
    USERS_FROM_SIGNAL: 10,
    USERS_BY_NAME: 11,
    USERS_IN_NEIGHBORHOOD: 12,
    USERS_IN_AREA: 13,
    USERS_WITH_HANDITEM: 14,
    USERS_IN_GROUP: 15,
    FURNI_WITH_ALTITUDE: 16,
    FURNI_WITH_VARIABLE: 17,
    USERS_WITH_VARIABLE: 18,
    REMOTE_SELECTOR: 19
};

describe('WiredSelectorLayoutCode', () =>
{
    it('uses the official selector codes', () =>
    {
        for(const [ name, code ] of Object.entries(OFFICIAL)) expect((WiredSelectorLayoutCode as unknown as Record<string, number>)[name], name).toBe(code);
    });

    it('keeps our own selectors at 1000 and up, every code once', () =>
    {
        const codes = Object.values(WiredSelectorLayoutCode as unknown as Record<string, number>);
        const custom = codes.filter(code => !Object.values(OFFICIAL).includes(code));

        expect(custom.every(code => code >= 1000)).toBe(true);
        expect(new Set(codes).size).toBe(codes.length);
    });
});
