// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { snapshotClubGifts } from './useClubGifts';

const parser = (giftsAvailable: number) =>
    ({
        daysUntilNextGift: 3,
        giftsAvailable,
        offers: [{ offerId: 1, localizationId: 'gift_one' }],
        giftData: new Map([[1, { offerId: 1, daysRequired: 31, isSelectable: true, isVip: false }]])
    }) as any;

describe('snapshotClubGifts', () => {
    it('is nothing without a parser', () => {
        expect(snapshotClubGifts(null)).toBeNull();
    });

    it('copies the values, so a reused parser gives a new state each time', () => {
        const reused = parser(60);
        const before = snapshotClubGifts(reused);

        reused.giftsAvailable = 59;

        const after = snapshotClubGifts(reused);

        expect(before).not.toBe(after);
        expect(before.giftsAvailable).toBe(60);
        expect(after.giftsAvailable).toBe(59);
        expect(after.getOfferExtraData(1).daysRequired).toBe(31);
        expect(after.getOfferExtraData(99)).toBeNull();
    });
});
