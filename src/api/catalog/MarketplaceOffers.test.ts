import { GetSessionDataManager } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketplaceOfferData } from './MarketplaceOfferData';
import { MarketPlaceOfferState } from './MarketplaceOfferState';
import {
    filterMarketplaceOwnOffers,
    getMarketplaceListStatusText,
    getMarketplaceOfferText,
    getMarketplaceOwnBottomButton,
    getMarketplaceTimeLeftText,
    isMarketplacePosterOffer,
    MARKETPLACE_SORT_TYPES,
    parseMarketplacePriceInput
} from './MarketplaceOffers';
import { MarketplaceSearchType } from './MarketplaceSearchType';

vi.mock('../utils/LocalizeText', () => ({
    LocalizeText: (key: string) => (key === 'poster_7_name' ? 'Poster seven' : key)
}));

const TEXTS: Record<string, string> = {
    'catalog.marketplace.items_found': '%count% Meubi gevonden!',
    'catalog.marketplace.items_shown': 'Laat de eerste %count% meubels zien',
    'catalog.marketplace.no_items': 'Geen Meubi gevonden',
    'catalog.marketplace.offer.time_left': 'Tijd over: %time%',
    'catalog.marketplace.offer.hours': 'uur',
    'catalog.marketplace.offer.minutes': 'minuten'
};

const localize = (key: string) => TEXTS[key] ?? key;

const offer = (furniType: number, furniId: number, extraData = '') => new MarketplaceOfferData(1, furniId, furniType, extraData, null, 10, 1, 0);

const withFurniData = (floor: Record<number, object>, wall: Record<number, object> = {}) =>
    vi.mocked(GetSessionDataManager).mockReturnValue({
        getFloorItemData: (id: number) => floor[id] ?? null,
        getWallItemData: (id: number) => wall[id] ?? null
    } as never);

afterEach(() => {
    vi.mocked(GetSessionDataManager).mockReset();
});

describe('MarketplaceOffers', () => {
    it('offers the AIR sort types per search tab', () => {
        expect(MARKETPLACE_SORT_TYPES[MarketplaceSearchType.BY_ACTIVITY]).toEqual([3, 4, 5, 6]);
        expect(MARKETPLACE_SORT_TYPES[MarketplaceSearchType.BY_VALUE]).toEqual([1, 2]);
        expect(MARKETPLACE_SORT_TYPES[MarketplaceSearchType.ADVANCED]).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('reads an empty price input as no limit', () => {
        expect(parseMarketplacePriceInput('')).toBe(-1);
        expect(parseMarketplacePriceInput('25')).toBe(25);
        expect(parseMarketplacePriceInput('0')).toBe(0);
    });

    it('builds the status line like updateStatusDisplay', () => {
        expect(getMarketplaceListStatusText(localize, 0, 0)).toBe('Geen Meubi gevonden');
        expect(getMarketplaceListStatusText(localize, 3, 3)).toBe('3 Meubi gevonden!');
        expect(getMarketplaceListStatusText(localize, 500, 812)).toBe('812 Meubi gevonden!. Laat de eerste 500 meubels zien.');
    });

    it('splits the time left into hours and minutes', () => {
        expect(getMarketplaceTimeLeftText(localize, 0)).toBe('Tijd over: 1 minuten');
        expect(getMarketplaceTimeLeftText(localize, 59)).toBe('Tijd over: 59 minuten');
        expect(getMarketplaceTimeLeftText(localize, 2881)).toBe('Tijd over: 48 uur 1 minuten');
    });

    it('filters the own offers by category and search text', () => {
        const offers = [
            { status: MarketPlaceOfferState.ONGOING, name: 'Throne' },
            { status: MarketPlaceOfferState.SOLD, name: 'Throne' },
            { status: MarketPlaceOfferState.ONGOING, name: 'Club sofa' }
        ];

        expect(filterMarketplaceOwnOffers(offers, MarketPlaceOfferState.ONGOING, '', (value) => value.name)).toHaveLength(2);
        expect(filterMarketplaceOwnOffers(offers, MarketPlaceOfferState.ONGOING, 'sofa', (value) => value.name)).toEqual([offers[2]]);
        expect(filterMarketplaceOwnOffers(offers, MarketPlaceOfferState.SOLD, '', (value) => value.name)).toEqual([offers[1]]);
        expect(getMarketplaceOwnBottomButton(MarketPlaceOfferState.ONGOING)).toBe('recall');
        expect(getMarketplaceOwnBottomButton(MarketPlaceOfferState.EXPIRED)).toBe('seen');
    });

    it('names an offer from furnidata instead of the raw roomItem key', () => {
        withFurniData({ 2270: { className: 'throne', name: 'Throne', description: 'Important Habbos only' } });

        expect(getMarketplaceOfferText(offer(MarketplaceOfferData.TYPE_FLOOR, 2270), 'name')).toBe('Throne');
        expect(getMarketplaceOfferText(offer(MarketplaceOfferData.TYPE_FLOOR, 2270), 'desc')).toBe('Important Habbos only');
    });

    it('falls back to the class name, never the key', () => {
        withFurniData({ 9: { className: 'rare_dragonlamp', name: '', description: '' } });

        expect(getMarketplaceOfferText(offer(MarketplaceOfferData.TYPE_FLOOR, 9), 'name')).toBe('rare_dragonlamp');
        expect(getMarketplaceOfferText(offer(MarketplaceOfferData.TYPE_FLOOR, 404), 'name')).toBe('');
    });

    it('uses poster_<id>_name for a poster offer', () => {
        withFurniData({}, { 4001: { className: 'poster', name: 'Poster', description: '' } });

        const poster = offer(MarketplaceOfferData.TYPE_WALL, 4001, '7');

        expect(isMarketplacePosterOffer(poster)).toBe(true);
        expect(getMarketplaceOfferText(poster, 'name')).toBe('Poster seven');
        expect(isMarketplacePosterOffer(offer(MarketplaceOfferData.TYPE_WALL, 4001))).toBe(false);
    });
});
