import { describe, expect, it } from 'vitest';
import { getInventoryPreviewButtons, getInventoryRentState, getInventoryRentTextKey, PreviewButtonsInput } from './inventoryFurniPreview';

const rented = (hasRentPeriodStarted: boolean, secondsToExpiration: number) => ({ isRented: true, hasRentPeriodStarted, secondsToExpiration });

const buttons = (overrides: Partial<PreviewButtonsInput> = {}): PreviewButtonsInput => ({
    isRented: false,
    flatId: -1,
    category: 1,
    sellable: false,
    isTrading: false,
    inPrivateRoom: true,
    rentCouldBeUsedForBuyout: true,
    purchaseCouldBeUsedForBuyout: true,
    ...overrides
});

describe('getInventoryRentState', () => {
    it('shows nothing for owned furni', () => {
        expect(getInventoryRentState({ isRented: false, hasRentPeriodStarted: true, secondsToExpiration: 10 })).toBeNull();
        expect(getInventoryRentState(null)).toBeNull();
    });

    it('marks a rent that has not started, one that runs and one that is about to end', () => {
        expect(getInventoryRentState(rented(false, 500000))).toBe('not_started');
        expect(getInventoryRentState(rented(true, 500000))).toBe('started');
        expect(getInventoryRentState(rented(true, 172799))).toBe('ending');
    });

    it('honours the configured warning duration', () => {
        expect(getInventoryRentState(rented(true, 3000), 60)).toBe('started');
        expect(getInventoryRentState(rented(true, 30), 60)).toBe('ending');
    });
});

describe('getInventoryRentTextKey', () => {
    it('picks the expiration text once the rent runs and the inactive text before', () => {
        expect(getInventoryRentTextKey(rented(true, 10))).toBe('inventory.rent.expiration');
        expect(getInventoryRentTextKey(rented(false, 10))).toBe('inventory.rent.inactive');
        expect(getInventoryRentTextKey({ isRented: false, hasRentPeriodStarted: false, secondsToExpiration: -1 })).toBeNull();
    });
});

describe('getInventoryPreviewButtons', () => {
    it('offers place and sell for an owned furni', () => {
        expect(getInventoryPreviewButtons(buttons({ sellable: true }))).toEqual({
            place: true,
            extend: false,
            buyout: false,
            gotoRoom: false,
            use: false,
            sell: true
        });
    });

    it('offers extend and buy-out for a rented furni still in the inventory', () => {
        const result = getInventoryPreviewButtons(buttons({ isRented: true }));

        expect(result.place).toBe(true);
        expect(result.extend).toBe(true);
        expect(result.buyout).toBe(true);
        expect(result.gotoRoom).toBe(false);
    });

    it('only offers the way to the room for a rented furni that is placed', () => {
        const result = getInventoryPreviewButtons(buttons({ isRented: true, flatId: 42 }));

        expect(result.place).toBe(false);
        expect(result.extend).toBe(false);
        expect(result.buyout).toBe(false);
        expect(result.gotoRoom).toBe(true);
    });

    it('follows the furni data flags for extend and buy-out', () => {
        const result = getInventoryPreviewButtons(buttons({ isRented: true, rentCouldBeUsedForBuyout: false, purchaseCouldBeUsedForBuyout: false }));

        expect(result.extend).toBe(false);
        expect(result.buyout).toBe(false);
    });

    it('hides everything but use while a trade is open', () => {
        const result = getInventoryPreviewButtons(buttons({ isRented: true, flatId: 42, sellable: true, isTrading: true, category: 16 }));

        expect(result).toEqual({ place: false, extend: false, buyout: false, gotoRoom: false, use: true, sell: false });
    });

    it('offers use for pet products only inside a private room', () => {
        expect(getInventoryPreviewButtons(buttons({ category: 13 })).use).toBe(true);
        expect(getInventoryPreviewButtons(buttons({ category: 20 })).use).toBe(true);
        expect(getInventoryPreviewButtons(buttons({ category: 13, inPrivateRoom: false })).use).toBe(false);
        expect(getInventoryPreviewButtons(buttons({ category: 1 })).use).toBe(false);
    });
});
