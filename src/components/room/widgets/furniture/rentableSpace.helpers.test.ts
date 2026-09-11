import { describe, expect, it } from 'vitest';
import { formatRentableSpacePrice, getRentableSpaceErrorKey, RentableSpaceStatus, resolveRentableSpaceView } from './rentableSpace.helpers';

const free: RentableSpaceStatus = {
    rented: false,
    canRent: true,
    canRentErrorCode: 0,
    renterId: -1,
    renterName: '',
    timeRemaining: 0,
    price: 40
};

describe('resolveRentableSpaceView', () => {
    it('shows nothing before the status arrives', () => {
        expect(resolveRentableSpaceView(null, -1, 100)).toBeNull();
    });

    it('offers the rent when the server allows it and the viewer can pay', () => {
        expect(resolveRentableSpaceView(free, -1, 40)).toEqual({ mode: 'rent', price: 40, canRent: true, errorKey: null });
    });

    it('keeps the rent button disabled with the server reason', () => {
        expect(resolveRentableSpaceView({ ...free, canRent: false, canRentErrorCode: 203 }, -1, 999)).toEqual({
            mode: 'rent',
            price: 40,
            canRent: false,
            errorKey: 'rentablespace.widget.error_reason_no_habboclub'
        });
    });

    it('reports missing credits client side like the official widget', () => {
        expect(resolveRentableSpaceView(free, -1, 39)).toEqual({
            mode: 'rent',
            price: 40,
            canRent: false,
            errorKey: 'rentablespace.widget.error_reason_not_enough_credits'
        });
    });

    it('shows the renter and the time left for a rented space', () => {
        const rented: RentableSpaceStatus = {
            ...free,
            rented: true,
            renterId: 7,
            renterName: 'Simo',
            timeRemaining: 3600,
            canRent: false,
            canRentErrorCode: 100
        };

        expect(resolveRentableSpaceView(rented, -1, 0)).toEqual({ mode: 'rented', renterName: 'Simo', timeRemaining: 3600 });
    });

    it('never shows a negative time left', () => {
        expect(resolveRentableSpaceView({ ...free, rented: true, timeRemaining: -5 }, -1, 0)).toMatchObject({ timeRemaining: 0 });
    });

    it('switches to the error view after a failed rent, whatever the status says', () => {
        expect(resolveRentableSpaceView(free, 103, 999)).toEqual({ mode: 'error', errorKey: 'rentablespace.widget.error_reason_can_rent_only_one_space' });
    });
});

describe('getRentableSpaceErrorKey', () => {
    it('maps every official reason and falls back to the generic text', () => {
        expect(getRentableSpaceErrorKey(100)).toBe('rentablespace.widget.error_reason_already_rented');
        expect(getRentableSpaceErrorKey(300)).toBe('rentablespace.widget.error_reason_disabled');
        expect(getRentableSpaceErrorKey(999)).toBe('rentablespace.widget.error_reason_generic');
    });
});

describe('formatRentableSpacePrice', () => {
    it('renders the "<price> x" label of the rent button', () => {
        expect(formatRentableSpacePrice(40)).toBe('40 x');
        expect(formatRentableSpacePrice(-3)).toBe('0 x');
    });
});
