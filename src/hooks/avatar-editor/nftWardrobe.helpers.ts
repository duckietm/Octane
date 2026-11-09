/**
 * AIR avatar collectibles (avatar/nft/NftAvatarsModel, NftOutfit, NftWardrobeParamView and the NFT parts of
 * HabboAvatarEditor / AvatarEditorView). Pure decisions, so the editor hook stays thin and testable.
 */

export const NFT_CONTRACT_AVATAR = 'habbo:avatar';
export const NFT_CONTRACT_CLOTHES = 'habbo:clothes';
export const NFT_CONTRACT_GENESIS = 'habbo:avatar_genesis';

export interface NftOutfit {
    /** What the editor sends back to wear it (133). */
    id: string;
    figure: string;
    gender: 'M' | 'F';
    /** What the worn outfit (350) names. */
    tokenId: string;
    contractKey: string;
}

export interface NftWornOutfit {
    tokenId: string;
    fallbackFigure: string;
    fallbackGender: 'M' | 'F';
}

export interface NftWardrobeItemLike {
    id: string;
    figureString: string;
    gender: string;
    tokenId: string;
    contractKey: string;
}

/** AIR loadAvatarInEditor: "f"/"F" is female, anything else male. */
export const normalizeNftGender = (gender: string): 'M' | 'F' => ((gender ?? '').trim().toUpperCase() === 'F' ? 'F' : 'M');

/** AIR onUserNftWardrobeMessage: every list replaces the previous one. Outfits without a figure cannot be picked. */
export const toNftOutfits = (items: readonly NftWardrobeItemLike[]): NftOutfit[] =>
    (items ?? [])
        .filter((item) => !!item && !!item.figureString)
        .map((item) => ({
            id: item.id ?? '',
            figure: item.figureString,
            gender: normalizeNftGender(item.gender),
            tokenId: item.tokenId ?? '',
            contractKey: item.contractKey ?? ''
        }));

/** AIR getNftAvatarByTokenId. */
export const findNftOutfitByToken = (outfits: readonly NftOutfit[], tokenId: string): NftOutfit | null =>
    tokenId ? (outfits.find((outfit) => outfit.tokenId === tokenId) ?? null) : null;

export type NftTabSwitchAction = 'loadWorn' | 'loadFallback' | 'restorePrevious' | 'none';

export interface NftTabSwitch {
    toNft: boolean;
    toEffects: boolean;
    toHotLooks: boolean;
    /** A collectible is worn (the server answered 350). */
    hasWorn: boolean;
    /** A collectible was picked in the NFT tab and not saved yet. */
    hasPending: boolean;
}

/**
 * AIR AvatarEditorView.windowEventProc on a tab change: while a collectible is worn, the NFT tab (and the
 * effects tab) show it and every clothing tab shows the look it replaced; a collectible only picked, not saved,
 * is dropped for the look from before it when the user goes to a clothing tab. Hot looks change nothing.
 */
export const resolveNftTabSwitch = (change: NftTabSwitch): NftTabSwitchAction => {
    if (change.toHotLooks) return 'none';

    if (change.toEffects) return change.hasWorn ? 'loadWorn' : 'none';

    if (change.hasWorn) return change.toNft ? 'loadWorn' : 'loadFallback';

    if (change.hasPending && !change.toNft) return 'restorePrevious';

    return 'none';
};

export interface NftCollectionStyle {
    nameKey: string;
    nameFallback: string;
    /** NftWardrobeParamView text colour. */
    textColor: string;
    /** NftOutfit.initNftColors: frame colours of the grid item. */
    colors: string[];
}

const NFT_COLLECTION_STYLES: Record<string, NftCollectionStyle> = {
    [NFT_CONTRACT_AVATAR]: { nameKey: 'wardrobe.token.avatar.name', nameFallback: 'Habbo Avatar', textColor: '#ff8823', colors: ['#ff6800', '#ff8823'] },
    [NFT_CONTRACT_CLOTHES]: { nameKey: 'wardrobe.token.clothing.name', nameFallback: 'Outfit', textColor: '#b3adc5', colors: ['#a09ab3', '#b3adc5'] },
    [NFT_CONTRACT_GENESIS]: {
        nameKey: 'wardrobe.token.crafted_avatar.name',
        nameFallback: 'Crafted Avatar',
        textColor: '#1acae1',
        colors: ['#1d97a7', '#3ca9b9', '#9430b3', '#a84bc3']
    }
};

/** The collection of an outfit as AIR shows it, or null for an unknown contract (no label, white frame). */
export const getNftCollectionStyle = (contractKey: string): NftCollectionStyle | null => NFT_COLLECTION_STYLES[contractKey] ?? null;

/** NftWardrobeParamView: "<collection name> #<id>". */
export const formatNftOutfitLabel = (collectionName: string, outfit: NftOutfit): string => `${collectionName ?? ''} #${outfit.id}`;
