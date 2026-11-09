import type { CollectibleCollectionData, CollectibleInventoryItemData, CollectibleProductData, CollectibleShopOfferData } from '@octane/renderer';

/** `CollectiblesController.linkPattern`: `collectibles/open` opens the hub. */
export const COLLECTIBLES_LINK_PREFIX = 'collectibles/';

/** Official `class_3169` product types. */
export const CollectibleProductType = {
    WALL: 0,
    FLOOR: 1,
    EFFECT: 2,
    BADGE: 4,
    CHAT_STYLE: 9,
    PET: 10,
    CLOTHING: 11
} as const;

/** The hub tabs (`top_view_*_button`), in the official order. */
export type CollectiblesTab = 'rewards' | 'collections' | 'shop' | 'minting' | 'transfer' | 'info';

export const COLLECTIBLES_TABS: CollectiblesTab[] = ['rewards', 'collections', 'shop', 'minting', 'transfer', 'info'];

/** `CollectiblesView`: the minting, transfer and shop tabs only show when the client configuration enables them. */
export const visibleCollectiblesTabs = (config: (key: string) => boolean): CollectiblesTab[] =>
    COLLECTIBLES_TABS.filter((tab) => {
        if (tab === 'minting') return config('nft.minting.enabled');
        if (tab === 'transfer') return config('collectibles.transfer.enabled');
        if (tab === 'shop') return config('nft.shop.enabled');
        return true;
    });

export const TAB_CAPTIONS: Record<CollectiblesTab, [string, string]> = {
    rewards: ['collectibles.claim.title', 'Rewards'],
    collections: ['collectibles.collections.title', 'Collectibles'],
    shop: ['collectibles.shop.title', 'Shop'],
    minting: ['shop.minting.title', 'Minting'],
    transfer: ['collectibles.transfer', 'Transfer'],
    info: ['collectibles.info.title', 'Info']
};

export const toHexColor = (color: number): string => `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;

/** `class_2712`: the colour of a rarity (grey for an unknown one). */
const RARITY_COLORS: Record<string, number> = {
    common: 6187373,
    uncommon: 24916,
    rare: 1202293,
    epic: 7150694,
    legendary: 8526848,
    'legendary+': 11167744
};

export const rarityColor = (rarity: string): number => RARITY_COLORS[(rarity ?? '').toLowerCase()] ?? 8947848;

/** `class_4367.getColor`: red for nothing owned, green for a complete set, yellow to olive in between. */
export const collectionProgressColor = (owned: number, total: number): number => {
    if (owned === total) return 37130;
    if (owned === 0 || total <= 0) return 8912917;

    const percentage = (owned * 100) / total;
    const interpolate = (from: number, to: number, fraction: number): number => {
        const channel = (value: number, shift: number) => (value >> shift) & 255;
        const mix = (shift: number) => Math.round(channel(from, shift) + fraction * (channel(to, shift) - channel(from, shift)));

        return ((mix(16) << 16) | (mix(8) << 8) | mix(0)) >>> 0;
    };

    if (percentage <= 50) return interpolate(12278528, 12952320, (percentage - 1) / 49);

    return interpolate(12952320, 8958976, (percentage - 50) / 49);
};

/** `CollectiblesView._r0c57f05fa1b2ad`: the level badge colour, one tier per five levels. */
export const collectorLevelColor = (level: number): number => {
    const tier = Math.max(0, Math.floor((level - 1) / 5));

    switch (tier) {
        case 0:
            return 8162450;
        case 1:
            return 2529547;
        case 2:
            return 32234;
        case 3:
            return 13828339;
        default:
            return 15571457;
    }
};

/** `CollectiblesController.getProductType`. */
export const productTypeKey = (productTypeId: number): string => {
    switch (productTypeId) {
        case CollectibleProductType.FLOOR:
            return 'product.type.room';
        case CollectibleProductType.WALL:
            return 'product.type.wall';
        case CollectibleProductType.CLOTHING:
            return 'product.type.clothing';
        case CollectibleProductType.CHAT_STYLE:
            return 'product.type.chatstyle';
        case CollectibleProductType.BADGE:
            return 'product.type.badge';
        case CollectibleProductType.EFFECT:
            return 'product.type.effect';
        case CollectibleProductType.PET:
            return 'product.type.pets';
        default:
            return '';
    }
};

export const PRODUCT_TYPE_FALLBACKS: Record<string, string> = {
    'product.type.room': 'Floor item',
    'product.type.wall': 'Wall item',
    'product.type.clothing': 'Clothing',
    'product.type.chatstyle': 'Chat style',
    'product.type.badge': 'Badge',
    'product.type.effect': 'Avatar effect',
    'product.type.pets': 'Pet'
};

export interface ProductNameLookup {
    floorName: (id: number) => string | null;
    wallName: (id: number) => string | null;
    badgeName: (code: string) => string;
    localize: (key: string, fallback: string) => string;
}

/** `CollectiblesController.getProductName`. */
export const collectibleProductName = (product: CollectibleProductData, lookup: ProductNameLookup): string => {
    if (!product) return 'unknown';

    switch (product.productTypeId) {
        case CollectibleProductType.FLOOR:
        case CollectibleProductType.CLOTHING:
            return lookup.floorName(Number(product.itemTypeId)) ?? '(missing floor item)';
        case CollectibleProductType.WALL:
            return lookup.wallName(Number(product.itemTypeId)) ?? '(missing wall item)';
        case CollectibleProductType.EFFECT:
            return lookup.localize(`fx_${product.itemTypeId}`, `Effect ${product.itemTypeId}`);
        case CollectibleProductType.BADGE:
            return lookup.badgeName(product.itemTypeId);
        case CollectibleProductType.PET:
            return lookup.localize(`pet.type.${product.itemTypeId}`, `Pet ${product.itemTypeId}`);
        case CollectibleProductType.CHAT_STYLE:
            return lookup.localize('product.type.chatstyle', 'Chat style');
        default:
            return product.productCode || '(missing)';
    }
};

/** dd/mm/yyyy, as the official claim and bonus dates. */
export const formatCollectibleDate = (ms: number): string => {
    const date = new Date(ms);

    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).padStart(4, '0')}`;
};

// ------------------------------------------------------------------ collections

/** Claims the client sent and is waiting on (`_r33ef48da007918` bonus, `_rc113f286b3fb63` reward). */
export interface PendingClaims {
    bonus: boolean;
    reward: boolean;
}

const claimUsedUp = (claim: { claimedAmount: number; claimLimit: number }): boolean => claim.claimedAmount > 0 && claim.claimedAmount >= claim.claimLimit;

/** `class_4341` claim getters: whether the bonus / reward can be claimed now, or is done. */
export const collectionClaimState = (collection: CollectibleCollectionData, pending: PendingClaims = { bonus: false, reward: false }) => {
    const hasBonus = !!collection.bonusItem;
    const hasReward = !!collection.rewardItem;
    const bonusDone = hasBonus && !!collection.bonusClaim && (claimUsedUp(collection.bonusClaim) || pending.bonus);
    const rewardDone = hasReward && !!collection.rewardClaim && (claimUsedUp(collection.rewardClaim) || pending.reward);
    const bonusClaimable =
        hasBonus &&
        !!collection.bonusClaim &&
        collection.bonusClaim.status === 0 &&
        !bonusDone &&
        collection.bonusClaim.claimedAmount < collection.bonusClaim.claimLimit &&
        !pending.bonus;
    const rewardClaimable =
        hasReward &&
        !!collection.rewardClaim &&
        collection.rewardClaim.status === 0 &&
        !rewardDone &&
        collection.rewardClaim.claimedAmount < collection.rewardClaim.claimLimit &&
        !pending.reward;

    return { hasBonus, hasReward, bonusDone, rewardDone, bonusClaimable, rewardClaimable };
};

/** `CollectionView.initRewardClaim`: what the preview shows when no product is selected. */
export type CollectionPreview =
    | { kind: 'bonus'; product: CollectibleProductData; claimable: boolean }
    | { kind: 'reward'; product: CollectibleProductData; claimable: boolean }
    | { kind: 'collection' };

export const collectionPreview = (collection: CollectibleCollectionData, pending?: PendingClaims): CollectionPreview => {
    const state = collectionClaimState(collection, pending);

    if (state.bonusClaimable) return { kind: 'bonus', product: collection.bonusItem, claimable: true };
    if (state.rewardClaimable) return { kind: 'reward', product: collection.rewardItem, claimable: true };
    if (state.hasBonus && !state.bonusDone) return { kind: 'bonus', product: collection.bonusItem, claimable: false };
    if (state.hasReward && !state.rewardDone) return { kind: 'reward', product: collection.rewardItem, claimable: false };

    return { kind: 'collection' };
};

/** `CollectionView._rb8433e661126ff`: the bonus window bar; hidden without a window. */
export const bonusTimer = (start: number, end: number, now: number) => {
    const hasWindow = Number.isFinite(start) && Number.isFinite(end) && start !== -1 && end !== -1;

    if (!hasWindow) return { visible: false, expired: false, fraction: 0, msLeft: 0 };

    if (now >= end) return { visible: true, expired: true, fraction: 1, msLeft: 0 };

    const left = Math.max(0, end - now);
    const span = end - start;

    return { visible: true, expired: false, fraction: span <= 0 ? 1 : Math.min(1, Math.max(0, left / span)), msLeft: left };
};

/** Products of the set owned at least once, and the share of the set that is (`_rc084fcd9702b88`, `progressPercentage`). */
export const collectionOwnedCount = (collection: CollectibleCollectionData): number => (collection.items ?? []).filter((item) => item.amount > 0).length;

export const collectionProgress = (collection: CollectibleCollectionData): number => {
    const total = (collection.items ?? []).length;

    return total ? (collectionOwnedCount(collection) * 100) / total : 0;
};

/** `CollectionsTab` sort options: 0 default (claimable first), 1 progress, 2 score. */
export const sortCollections = (collections: CollectibleCollectionData[], mode: number, now: number = Date.now()): CollectibleCollectionData[] => {
    const list = [...collections];

    if (mode === 1) {
        const started = list.filter((collection) => collectionProgress(collection) > 0).sort((a, b) => collectionProgress(b) - collectionProgress(a));

        return started.concat(list.filter((collection) => collectionProgress(collection) <= 0));
    }

    if (mode === 2) {
        const scored = list.filter((collection) => collection.score > 0).sort((a, b) => b.score - a.score);

        return scored.concat(list.filter((collection) => collection.score <= 0));
    }

    const claimable = list.filter((collection) => collectionClaimState(collection).bonusClaimable);
    const running = list.filter((collection) => !!collection.bonusItem && !claimable.includes(collection) && !(collection.bonusEnd < now));

    return claimable.concat(running, list.filter((collection) => !claimable.includes(collection) && !running.includes(collection)));
};

// ------------------------------------------------------------------ shop

/** `ShopTab.getNavigationCategory`. */
export const shopCategoryKey = (productTypeId: number): string => {
    switch (productTypeId) {
        case CollectibleProductType.FLOOR:
        case CollectibleProductType.WALL:
            return 'shop.furni.title';
        case CollectibleProductType.CLOTHING:
            return 'shop.clothes.title';
        case CollectibleProductType.PET:
            return 'shop.pets.title';
        default:
            return 'product.type.other';
    }
};

export const SHOP_CATEGORY_FALLBACKS: Record<string, string> = {
    'shop.furni.title': 'Furni',
    'shop.clothes.title': 'Clothes',
    'shop.pets.title': 'Pets',
    'product.type.other': 'Other'
};

/** The shop navigation: one node per category, in the order the offers first name it. */
export const groupShopOffers = (offers: CollectibleShopOfferData[]): { categoryKey: string; offers: CollectibleShopOfferData[] }[] => {
    const groups: { categoryKey: string; offers: CollectibleShopOfferData[] }[] = [];

    for (const offer of offers) {
        const key = shopCategoryKey(offer.product?.productTypeId ?? -1);
        let group = groups.find((entry) => entry.categoryKey === key);

        if (!group) {
            group = { categoryKey: key, offers: [] };
            groups.push(group);
        }

        group.offers.push(offer);
    }

    return groups;
};

// ------------------------------------------------------------------ inventory

/** `CollectibleGroupedItem`: owned collectibles grouped by product code. */
export interface CollectibleGroup {
    productCode: string;
    product: CollectibleProductData;
    assetIds: number[];
}

export const groupCollectibles = (items: CollectibleInventoryItemData[]): CollectibleGroup[] => {
    const groups = new Map<string, CollectibleGroup>();

    for (const item of items) {
        if (!item.product) continue;

        const code = item.product.productCode;
        const group = groups.get(code);

        if (group) group.assetIds.push(item.assetId);
        else groups.set(code, { productCode: code, product: item.product, assetIds: [item.assetId] });
    }

    return Array.from(groups.values());
};

/** Applies a `1475` change: added collectibles join, removed asset ids leave. */
export const applyCollectiblesUpdate = (
    items: CollectibleInventoryItemData[],
    added: CollectibleInventoryItemData[],
    removed: CollectibleInventoryItemData[]
): CollectibleInventoryItemData[] => {
    const removedIds = new Set(removed.map((item) => item.assetId));
    const kept = items.filter((item) => !removedIds.has(item.assetId));
    const known = new Set(kept.map((item) => item.assetId));

    return kept.concat(added.filter((item) => !known.has(item.assetId)));
};

/** `CollectiblesView._r6b448aeb8fea30`: the filter options after "Everything". */
export const INVENTORY_FILTER_TYPES: number[] = [
    CollectibleProductType.FLOOR,
    CollectibleProductType.WALL,
    CollectibleProductType.CLOTHING,
    CollectibleProductType.CHAT_STYLE,
    CollectibleProductType.BADGE,
    CollectibleProductType.EFFECT,
    CollectibleProductType.PET
];

/** Filter 0 is everything; option n is `INVENTORY_FILTER_TYPES[n - 1]`. The text matches the product name. */
export const filterCollectibleGroups = (
    groups: CollectibleGroup[],
    filterIndex: number,
    text: string,
    nameOf: (group: CollectibleGroup) => string
): CollectibleGroup[] => {
    const type = filterIndex <= 0 ? -1 : (INVENTORY_FILTER_TYPES[filterIndex - 1] ?? -1);
    const comparison = (text ?? '').trim().toLocaleLowerCase();

    return groups.filter((group) => {
        if (type !== -1 && group.product.productTypeId !== type) return false;

        return !comparison.length || nameOf(group).toLocaleLowerCase().includes(comparison);
    });
};

// ------------------------------------------------------------------ transfer and minting

/** `TransferNftsTab.updateTransferButtonState`, with a recipient name in place of the external wallet. */
export const canTransfer = (fee: number, silver: number, collectorWallet: string, pending: boolean, recipient: string): boolean =>
    fee <= silver && !!collectorWallet && !pending && !!(recipient ?? '').trim().length;

/**
 * `MintInventoryListTab.initMintItemPreview`: whether the collect button is enabled. Like
 * `isMintPeriodExpired` (`endTime * 1000 < Date.now()`), a relic without an end (0) is over.
 */
export const canMint = (options: {
    hasWallet: boolean;
    furniOwned: number;
    tokens: number;
    price: number;
    endTime: number;
    mintingEnabled: boolean;
    pending: boolean;
    now: number;
}): boolean =>
    options.hasWallet &&
    options.furniOwned > 0 &&
    options.tokens >= options.price &&
    options.endTime * 1000 >= options.now &&
    options.mintingEnabled &&
    !options.pending;
