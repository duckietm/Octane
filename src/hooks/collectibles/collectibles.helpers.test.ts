import { describe, expect, it } from 'vitest';
import {
    applyCollectiblesUpdate,
    bonusTimer,
    canMint,
    canTransfer,
    collectibleProductName,
    collectionClaimState,
    collectionPreview,
    collectionProgressColor,
    collectorLevelColor,
    filterCollectibleGroups,
    groupCollectibles,
    groupShopOffers,
    rarityColor,
    sortCollections,
    visibleCollectiblesTabs
} from './collectibles.helpers';

const product = (code: string, type = 1, amount = 0, itemTypeId = '18') =>
    ({ productTypeId: type, itemTypeId, score: 10, amount, petFigure: '', figureSetIds: [], productCode: code, rarity: 'rare' }) as any;

const claim = (status: number, claimedAmount = 0, claimLimit = 1) => ({ claimId: 'c', status, claimedAmount, claimLimit }) as any;

const collection = (id: string, owned: number[], extra: any = {}) =>
    ({
        collectionId: id,
        collectionName: id,
        items: owned.map((amount, index) => product(`${id}_${index}`, 1, amount)),
        score: 0,
        goal: 0,
        completionXp: 0,
        bonusItem: null,
        rewardItem: null,
        bonusStart: -1,
        bonusEnd: -1,
        status: 0,
        bonusClaim: null,
        rewardClaim: null,
        ...extra
    }) as any;

describe('collectibles helpers', () => {
    it('shows the minting, transfer and shop tabs only when configured', () => {
        expect(visibleCollectiblesTabs(() => false)).toEqual(['rewards', 'collections', 'info']);
        expect(visibleCollectiblesTabs(() => true)).toEqual(['rewards', 'collections', 'shop', 'minting', 'transfer', 'info']);
    });

    it('colours rarities, set progress and level tiers as the official client', () => {
        expect(rarityColor('EPIC')).toBe(7150694);
        expect(rarityColor('mystery')).toBe(8947848);
        expect(collectionProgressColor(3, 3)).toBe(37130);
        expect(collectionProgressColor(0, 3)).toBe(8912917);
        expect(collectorLevelColor(1)).toBe(8162450);
        expect(collectorLevelColor(6)).toBe(2529547);
        expect(collectorLevelColor(30)).toBe(15571457);
    });

    it('names products by type', () => {
        const lookup = {
            floorName: (id: number) => (id === 18 ? 'Bear' : null),
            wallName: () => null,
            badgeName: (code: string) => `badge ${code}`,
            localize: (key: string, fallback: string) => fallback
        };

        expect(collectibleProductName(product('a', 1), lookup)).toBe('Bear');
        expect(collectibleProductName(product('a', 0), lookup)).toBe('(missing wall item)');
        expect(collectibleProductName(product('a', 4, 0, 'NFT01'), lookup)).toBe('badge NFT01');
        expect(collectibleProductName(null, lookup)).toBe('unknown');
    });

    it('opens the reward of a complete set and keeps a claimed one closed', () => {
        const open = collection('toys', [1, 1], { rewardItem: product('trophy'), rewardClaim: claim(0) });

        expect(collectionClaimState(open).rewardClaimable).toBe(true);
        expect(collectionPreview(open)).toMatchObject({ kind: 'reward', claimable: true });
        expect(collectionClaimState(open, { bonus: false, reward: true }).rewardClaimable).toBe(false);

        const claimed = collection('toys', [1, 1], { rewardItem: product('trophy'), rewardClaim: claim(1, 1, 1) });

        expect(collectionPreview(claimed)).toEqual({ kind: 'collection' });

        const locked = collection('toys', [1, 0], { bonusItem: product('star'), bonusClaim: claim(1) });

        expect(collectionPreview(locked)).toMatchObject({ kind: 'bonus', claimable: false });
    });

    it('runs the bonus timer down to its end', () => {
        expect(bonusTimer(-1, -1, 5).visible).toBe(false);
        expect(bonusTimer(0, 100, 50)).toMatchObject({ visible: true, expired: false, fraction: 0.5, msLeft: 50 });
        expect(bonusTimer(0, 100, 100).expired).toBe(true);
    });

    it('sorts sets by progress and puts claimable bonuses first by default', () => {
        const a = collection('a', [0, 0]);
        const b = collection('b', [1, 1]);
        const c = collection('c', [1, 0], { bonusItem: product('x'), bonusClaim: claim(0), bonusEnd: Number.MAX_SAFE_INTEGER });

        expect(sortCollections([a, b, c], 1).map((entry) => entry.collectionId)).toEqual(['b', 'c', 'a']);
        expect(sortCollections([a, b, c], 0)[0].collectionId).toBe('c');
    });

    it('groups shop offers by category in their order', () => {
        const offers = [
            { productCode: 'a', product: product('a', 11) },
            { productCode: 'b', product: product('b', 1) },
            { productCode: 'c', product: product('c', 11) }
        ] as any[];

        expect(groupShopOffers(offers).map((group) => [group.categoryKey, group.offers.length])).toEqual([
            ['shop.clothes.title', 2],
            ['shop.furni.title', 1]
        ]);
    });

    it('groups, filters and updates owned collectibles', () => {
        const items = [
            { assetId: 1, product: product('bear', 1) },
            { assetId: 2, product: product('bear', 1) },
            { assetId: 3, product: product('badge', 4) }
        ] as any[];
        const groups = groupCollectibles(items);

        expect(groups.map((group) => [group.productCode, group.assetIds])).toEqual([
            ['bear', [1, 2]],
            ['badge', [3]]
        ]);
        expect(filterCollectibleGroups(groups, 5, '', (group) => group.productCode).map((group) => group.productCode)).toEqual(['badge']);
        expect(filterCollectibleGroups(groups, 0, 'BE', (group) => group.productCode).map((group) => group.productCode)).toEqual(['bear']);

        const updated = applyCollectiblesUpdate(items, [{ assetId: 4, product: product('duck') }] as any[], [{ assetId: 1 }] as any[]);

        expect(updated.map((item) => item.assetId)).toEqual([2, 3, 4]);
    });

    it('enables transfer and mint only when everything is in place', () => {
        expect(canTransfer(10, 20, 'hotel-1', false, 'Bob')).toBe(true);
        expect(canTransfer(30, 20, 'hotel-1', false, 'Bob')).toBe(false);
        expect(canTransfer(10, 20, 'hotel-1', false, '  ')).toBe(false);

        const base = { hasWallet: true, furniOwned: 1, tokens: 3, price: 3, endTime: 5, mintingEnabled: true, pending: false, now: 1000 };

        expect(canMint(base)).toBe(true);
        expect(canMint({ ...base, tokens: 2 })).toBe(false);
        expect(canMint({ ...base, endTime: 1, now: 5000 })).toBe(false);
        expect(canMint({ ...base, endTime: 5, now: 5000 })).toBe(true);
        expect(canMint({ ...base, endTime: 0 })).toBe(false);
    });
});
