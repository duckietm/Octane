// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyChatStyleNotification, applyPurchasableChatStyles } from './usePurchasableChatStyles';

describe('purchasable chat styles', () => {
    it('replaces the owned list with the login list, without duplicates', () => {
        expect(applyPurchasableChatStyles([40, 41, 40])).toEqual([40, 41]);
        expect(applyPurchasableChatStyles(null)).toEqual([]);
    });

    it('adds a granted style once and removes a revoked one', () => {
        const owned = [40];

        expect(applyChatStyleNotification(owned, true, 41)).toEqual([40, 41]);
        expect(applyChatStyleNotification(owned, true, 40)).toBe(owned);
        expect(applyChatStyleNotification([40, 41], false, 40)).toEqual([41]);
        expect(applyChatStyleNotification(owned, false, 99)).toBe(owned);
    });
});
