import { localizeWithFallback } from '../utils/localizeWithFallback';
import { FurniCategory } from './FurniCategory';

interface IChestStuffData {
    uniqueNumber?: number;
    rarityLevel?: number;
    contentsCount?: number;
    chestName?: string;
    getValue?: (key: string) => string;
}

export type WiredChestOverlayColor = 'gold' | 'brown';

export interface IWiredChestInfostandData {
    /** `infostand.chest_contents.furni` / `.coin` with the contents count (chest_item_count). */
    countText: string;
    /** The owner's name for the chest (name_extra_text); empty hides the line. */
    chestName: string;
    /** `is_wired_enabled` = 1 shows the wired_chest_elements (wired icon, lock icon when locked). */
    wiredEnabled: boolean;
    locked: boolean;
}

const isChestCategory = (category: number): boolean => category === FurniCategory.FURNI_CHEST || category === FurniCategory.COINS_CHEST;

/**
 * AIR GroupItem.updateItemImageVisual: an LTD plaque wins over the rarity plaque, which wins over the
 * chest overlay; a chest tile is gold for a coins chest and brown for a furni chest.
 */
export const getWiredChestOverlayColor = (category: number, stuffData: IChestStuffData): WiredChestOverlayColor => {
    if (!isChestCategory(category)) return null;
    if ((stuffData?.uniqueNumber ?? 0) > 0) return null;
    if ((stuffData?.rarityLevel ?? -1) >= 0) return null;

    return category === FurniCategory.COINS_CHEST ? 'gold' : 'brown';
};

/**
 * AIR InfoStandFurniView.showChestData: only a furni / coins chest (furnidata special type 24 / 25) with map
 * stuff data shows the chest lines.
 */
export const getWiredChestInfostandData = (category: number, stuffData: IChestStuffData): IWiredChestInfostandData => {
    if (!isChestCategory(category) || !stuffData || typeof stuffData.getValue !== 'function') return null;

    const isFurni = category === FurniCategory.FURNI_CHEST;
    const amount = stuffData.getValue('contents_count') ?? '0';
    const wiredEnabled = stuffData.getValue('is_wired_enabled') === '1';

    return {
        countText: isFurni
            ? localizeWithFallback('infostand.chest_contents.furni', `Furni in the chest: ${ amount }`, ['amount'], [amount])
            : localizeWithFallback('infostand.chest_contents.coin', `Credits in the chest: ${ amount }`, ['amount'], [amount]),
        chestName: stuffData.chestName ?? '',
        wiredEnabled,
        locked: wiredEnabled && stuffData.getValue('locked') === '1'
    };
};
