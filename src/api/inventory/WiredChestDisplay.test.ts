import { describe, expect, it } from 'vitest';
import { FurniCategory } from './FurniCategory';
import { getWiredChestInfostandData, getWiredChestOverlayColor } from './WiredChestDisplay';

const mapData = (values: Record<string, string>, chestName = '') => ({
    uniqueNumber: 0,
    rarityLevel: -1,
    contentsCount: Number(values.contents_count ?? 0),
    chestName,
    getValue: (key: string) => values[key]
});

describe('wired chest inventory overlay (AIR GroupItem.updateItemImageVisual)', () => {
    it('is gold for a coins chest and brown for a furni chest', () => {
        expect(getWiredChestOverlayColor(FurniCategory.COINS_CHEST, mapData({}))).toBe('gold');
        expect(getWiredChestOverlayColor(FurniCategory.FURNI_CHEST, mapData({}))).toBe('brown');
    });

    it('leaves other furni, LTD chests and rarity chests alone', () => {
        expect(getWiredChestOverlayColor(FurniCategory.DEFAULT, mapData({}))).toBeNull();
        expect(getWiredChestOverlayColor(FurniCategory.FURNI_CHEST, { ...mapData({}), uniqueNumber: 3 })).toBeNull();
        expect(getWiredChestOverlayColor(FurniCategory.COINS_CHEST, { ...mapData({}), rarityLevel: 0 })).toBeNull();
    });
});

describe('wired chest infostand data (AIR InfoStandFurniView.showChestData)', () => {
    it('shows the furni count, the chest name and the wired elements', () => {
        expect(getWiredChestInfostandData(FurniCategory.FURNI_CHEST, mapData({ contents_count: '7', is_wired_enabled: '1', locked: '1' }, 'Schat'))).toEqual({
            countText: 'Furni in the chest: 7',
            chestName: 'Schat',
            wiredEnabled: true,
            locked: true
        });
    });

    it('uses the coin text for a coins chest and hides the wired elements when wired is off', () => {
        expect(getWiredChestInfostandData(FurniCategory.COINS_CHEST, mapData({ contents_count: '120', is_wired_enabled: '0', locked: '1' }))).toEqual({
            countText: 'Credits in the chest: 120',
            chestName: '',
            wiredEnabled: false,
            locked: false
        });
    });

    it('reads a missing count as zero', () => {
        expect(getWiredChestInfostandData(FurniCategory.FURNI_CHEST, mapData({}))?.countText).toBe('Furni in the chest: 0');
    });

    it('shows nothing for other furni or stuff data that is not a map', () => {
        expect(getWiredChestInfostandData(FurniCategory.DEFAULT, mapData({ contents_count: '1' }))).toBeNull();
        expect(getWiredChestInfostandData(FurniCategory.FURNI_CHEST, { contentsCount: 1 })).toBeNull();
    });
});
