import { describe, expect, it } from 'vitest';
import { ChatStyleAccess, ChatStyleConfigEntry, ResolveChatStyleIds } from './ResolveChatStyleIds';

const style = (styleId: number, flags: Partial<ChatStyleConfigEntry> = {}): ChatStyleConfigEntry => ({
    styleId,
    minRank: 0,
    isSystemStyle: false,
    isHcOnly: false,
    isAmbassadorOnly: false,
    ...flags
});

const access = (overrides: Partial<ChatStyleAccess> = {}): ChatStyleAccess => ({
    hasSecurity: () => false,
    canUseSystemStyles: false,
    disabledStyleIds: [],
    isClubMember: false,
    isAmbassador: false,
    ownedPurchasableStyleIds: [],
    ...overrides
});

describe('ResolveChatStyleIds', () => {
    it('offers a purchasable style only once it is owned', () => {
        const styles = [style(0), style(40, { isPurchasable: true })];

        expect(ResolveChatStyleIds(styles, access())).toEqual([0]);
        expect(ResolveChatStyleIds(styles, access({ ownedPurchasableStyleIds: [40] }))).toEqual([0, 40]);
    });

    it('lets ownership win over the club and rank flags of a purchasable style', () => {
        const styles = [style(41, { isPurchasable: true, isHcOnly: true }), style(42, { isPurchasable: true, minRank: 7 })];

        expect(ResolveChatStyleIds(styles, access({ isClubMember: true, hasSecurity: () => true }))).toEqual([]);
        expect(ResolveChatStyleIds(styles, access({ ownedPurchasableStyleIds: [41, 42] }))).toEqual([41, 42]);
    });

    it('keeps the rank, system, disabled, club and ambassador rules for other styles', () => {
        const styles = [
            style(0),
            style(1, { minRank: 5, isSystemStyle: true }),
            style(2, { isSystemStyle: true }),
            style(3),
            style(4, { isHcOnly: true }),
            style(5, { isAmbassadorOnly: true })
        ];

        // A system style is never offered to a player without acc_anychatcolor (AIR), whatever its rank.
        expect(ResolveChatStyleIds(styles, access({ disabledStyleIds: [3] }))).toEqual([0]);
        expect(
            ResolveChatStyleIds(styles, access({ hasSecurity: (rank) => rank <= 5, canUseSystemStyles: true, isClubMember: true, isAmbassador: true }))
        ).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('does not offer a ranked system style on rank alone', () => {
        const styles = [style(1, { minRank: 5, isSystemStyle: true })];

        expect(ResolveChatStyleIds(styles, access({ hasSecurity: () => true }))).toEqual([]);
        expect(ResolveChatStyleIds(styles, access({ hasSecurity: () => false, canUseSystemStyles: true }))).toEqual([]);
        expect(ResolveChatStyleIds(styles, access({ hasSecurity: () => true, canUseSystemStyles: true }))).toEqual([1]);
    });
});
