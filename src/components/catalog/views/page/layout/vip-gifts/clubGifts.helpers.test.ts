import { describe, expect, it } from 'vitest';
import { getGiftRequirementText, getPastClubDaysText, getPastVipDaysText } from './clubGifts.helpers';

const gift = (overrides: Partial<{ isVip: boolean; isSelectable: boolean; daysRequired: number }> = {}) => ({
    isVip: false,
    isSelectable: false,
    daysRequired: 31,
    ...overrides
});

describe('club gift past days texts', () => {
    it('counts club and vip days together for the club line', () => {
        expect(getPastClubDaysText(0, 0)).toEqual({ key: 'catalog.club_gift.past_club', params: { days: 0, months: 0 } });
        expect(getPastClubDaysText(20, 10)).toEqual({ key: 'catalog.club_gift.past_club', params: { days: 30, months: 0 } });
    });

    it('switches to the long club line from a full month', () => {
        expect(getPastClubDaysText(31, 0)).toEqual({ key: 'catalog.club_gift.past_club.long', params: { days: 0, months: 1 } });
        expect(getPastClubDaysText(20, 13)).toEqual({ key: 'catalog.club_gift.past_club.long', params: { days: 2, months: 1 } });
        expect(getPastClubDaysText(31, 31)).toEqual({ key: 'catalog.club_gift.past_club.long', params: { days: 0, months: 2 } });
    });

    it('counts only vip days for the vip line', () => {
        expect(getPastVipDaysText(0)).toEqual({ key: 'catalog.club_gift.past_vip', params: { days: 0, months: 0 } });
        expect(getPastVipDaysText(30)).toEqual({ key: 'catalog.club_gift.past_vip', params: { days: 30, months: 0 } });
        expect(getPastVipDaysText(31)).toEqual({ key: 'catalog.club_gift.past_vip.long', params: { days: 0, months: 1 } });
        expect(getPastVipDaysText(62)).toEqual({ key: 'catalog.club_gift.past_vip.long', params: { days: 0, months: 2 } });
        expect(getPastVipDaysText(45)).toEqual({ key: 'catalog.club_gift.past_vip.long', params: { days: 14, months: 1 } });
    });

    it('never reports negative days', () => {
        expect(getPastVipDaysText(-5)).toEqual({ key: 'catalog.club_gift.past_vip', params: { days: 0, months: 0 } });
    });
});

describe('club gift requirement text', () => {
    it('measures a vip gift against vip days only', () => {
        const text = getGiftRequirementText(gift({ isVip: true, daysRequired: 62 }), { pastClubDays: 100, pastVipDays: 0 }, 0);

        expect(text).toEqual({ key: 'catalog.club_gift.vip_missing.long', params: { days: 0, months: 2 } });
    });

    it('measures a club gift against club and vip days together', () => {
        expect(getGiftRequirementText(gift({ daysRequired: 62 }), { pastClubDays: 40, pastVipDays: 10 }, 0)).toEqual({
            key: 'catalog.club_gift.club_missing',
            params: { days: 12, months: 0 }
        });
        expect(getGiftRequirementText(gift({ daysRequired: 30 }), { pastClubDays: 0, pastVipDays: 0 }, 0)).toEqual({
            key: 'catalog.club_gift.club_missing',
            params: { days: 30, months: 0 }
        });
        expect(getGiftRequirementText(gift({ daysRequired: 31 }), { pastClubDays: 0, pastVipDays: 0 }, 0)).toEqual({
            key: 'catalog.club_gift.club_missing.long',
            params: { days: 0, months: 1 }
        });
    });

    it('uses the vip wording for a vip gift', () => {
        expect(getGiftRequirementText(gift({ isVip: true, daysRequired: 20 }), { pastClubDays: 0, pastVipDays: 5 }, 0)).toEqual({
            key: 'catalog.club_gift.vip_missing',
            params: { days: 15, months: 0 }
        });
    });

    it('marks a selectable gift while gifts are available', () => {
        expect(getGiftRequirementText(gift({ isSelectable: true }), { pastClubDays: 31, pastVipDays: 0 }, 1)).toEqual({
            key: 'catalog.club_gift.selectable',
            params: null
        });
    });

    it('says nothing for a selectable gift when no gift is available', () => {
        expect(getGiftRequirementText(gift({ isSelectable: true }), { pastClubDays: 31, pastVipDays: 0 }, 0)).toBeNull();
    });

    it('says nothing for a gift that is not selectable without missing days', () => {
        expect(getGiftRequirementText(gift({ daysRequired: 31 }), { pastClubDays: 31, pastVipDays: 0 }, 0)).toBeNull();
    });
});
