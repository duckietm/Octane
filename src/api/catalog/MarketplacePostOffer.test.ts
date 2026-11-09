import { describe, expect, it } from 'vitest';
import {
    checkMarketplaceOfferPrice,
    getFurnidataText,
    getMarketplaceConfirmText,
    getMarketplaceFurniTextKeys,
    getMarketplaceOfferRevenue,
    isMarketplacePriceStatVisible,
    parseMarketplaceOfferAmount,
    pickMarketplaceFurniText,
    sanitizeMarketplaceDigits
} from './MarketplacePostOffer';

describe('MarketplacePostOffer', () => {
    it('keeps only digits, like the AIR inputs', () => {
        expect(sanitizeMarketplaceDigits('1a2-3 ')).toBe('123');
        expect(sanitizeMarketplaceDigits(null)).toBe('');
    });

    it('clamps the price to the maximum and validates against the minimum', () => {
        expect(checkMarketplaceOfferPrice('', 1, 1000)).toEqual({ price: 0, text: '', valid: false });
        expect(checkMarketplaceOfferPrice('50', 1, 1000)).toEqual({ price: 50, text: '50', valid: true });
        expect(checkMarketplaceOfferPrice('5000', 1, 1000)).toEqual({ price: 1000, text: '1000', valid: true });
        expect(checkMarketplaceOfferPrice('4', 5, 1000).valid).toBe(false);
        expect(checkMarketplaceOfferPrice('5', 5, 1000).valid).toBe(true);
    });

    it('parses the amount into 1..max', () => {
        expect(parseMarketplaceOfferAmount('', 5)).toBe(1);
        expect(parseMarketplaceOfferAmount('0', 5)).toBe(1);
        expect(parseMarketplaceOfferAmount('3', 5)).toBe(3);
        expect(parseMarketplaceOfferAmount('99', 5)).toBe(5);
        expect(parseMarketplaceOfferAmount('2', 0)).toBe(1);
    });

    it('applies the AIR revenue formula, and keeps the price without fee fields', () => {
        expect(getMarketplaceOfferRevenue(100)).toBe(100);
        expect(getMarketplaceOfferRevenue(0)).toBe(0);
        // 100 * (1/100 + 0.5 * 100 / 10000) = 1.5 -> 2
        expect(getMarketplaceOfferRevenue(100, 1, 10000)).toBe(98);
        // 1000 * 5/100 = 50
        expect(getMarketplaceOfferRevenue(1000, 5, 0)).toBe(950);
    });

    it('shows a stat line only for a positive price', () => {
        expect(isMarketplacePriceStatVisible(0)).toBe(false);
        expect(isMarketplacePriceStatVisible(-1)).toBe(false);
        expect(isMarketplacePriceStatVisible(12)).toBe(true);
    });

    it('builds the AIR confirmation: one item shows the revenue, several the price and total revenue', () => {
        expect(getMarketplaceConfirmText(1, 'Chair', 100, 98)).toEqual({
            key: 'inventory.marketplace.confirm_offer.info',
            parameters: ['furniname', 'price'],
            replacements: ['Chair', '98']
        });
        expect(getMarketplaceConfirmText(3, 'Chair', 100, 98)).toEqual({
            key: 'inventory.marketplace.confirm_offer.info.multiple',
            parameters: ['amount', 'furniname', 'price', 'total'],
            replacements: ['3', 'Chair', '100', '294']
        });
    });

    it('uses poster keys for posters and furni keys otherwise', () => {
        expect(getMarketplaceFurniTextKeys(true, 4001, '12')).toEqual({ name: 'poster_12_name', desc: 'poster_12_desc' });
        expect(getMarketplaceFurniTextKeys(false, 2270, null)).toEqual({ name: 'roomItem.name.2270', desc: 'roomItem.desc.2270' });
        expect(getMarketplaceFurniTextKeys(true, 30, null)).toEqual({ name: 'wallItem.name.30', desc: 'wallItem.desc.30' });
    });

    it('never shows a raw localization key as the furni name', () => {
        expect(pickMarketplaceFurniText('Throne', 'roomItem.name.2270', 'Other')).toBe('Throne');
        expect(pickMarketplaceFurniText('roomItem.name.2270', 'roomItem.name.2270', 'Throne')).toBe('Throne');
        expect(pickMarketplaceFurniText('roomItem.name.2270', 'roomItem.name.2270', '', 'throne_class')).toBe('throne_class');
    });
});

describe('getFurnidataText', () => {
    const lookup = {
        getFloorItemDataByName: (name: string) => (name === 'bed_budget_one' ? { name: 'Eenpersoonsbed', description: 'Lekker slapen', className: 'bed_budget_one' } : null),
        getWallItemDataByName: () => null
    };

    it('uses the furni\'s own furnidata text', () => {
        expect(getFurnidataText({ name: 'Tweepersoonsbed', className: 'bed_polyfon' }, false, lookup, 'name')).toBe('Tweepersoonsbed');
    });

    it('takes a colour variant\'s base furni text when its own is empty', () => {
        const variant = { name: '', description: '', className: 'bed_budget_one*1' };

        expect(getFurnidataText(variant, false, lookup, 'name')).toBe('Eenpersoonsbed');
        expect(getFurnidataText(variant, false, lookup, 'desc')).toBe('Lekker slapen');
    });

    it('falls back to the class name for the name only', () => {
        expect(getFurnidataText({ name: '', className: 'odd_furni*2' }, false, lookup, 'name')).toBe('odd_furni');
        expect(getFurnidataText({ name: '', className: 'odd_furni' }, false, lookup, 'name')).toBe('odd_furni');
        expect(getFurnidataText({ description: '', className: 'odd_furni' }, false, lookup, 'desc')).toBe('');
    });
});
