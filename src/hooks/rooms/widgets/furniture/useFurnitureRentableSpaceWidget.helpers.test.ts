import { describe, expect, it } from 'vitest';
import { RENTABLE_SPACE_ERROR_TEXTS, resolveRentableSpaceRentView } from './useFurnitureRentableSpaceWidget.helpers';

describe('resolveRentableSpaceRentView', () => {
    it('enables the rent button when the server allows it and the purse covers the price', () => {
        expect(resolveRentableSpaceRentView({ canRent: true, canRentErrorCode: 0, price: 10 }, 10)).toEqual({ rentEnabled: true, errorCode: 0 });
    });

    it('shows the not-enough-credits line when the price is above the purse', () => {
        expect(resolveRentableSpaceRentView({ canRent: true, canRentErrorCode: 0, price: 11 }, 10)).toEqual({ rentEnabled: false, errorCode: 200 });
    });

    it('shows the server reason when the user may not rent', () => {
        expect(resolveRentableSpaceRentView({ canRent: false, canRentErrorCode: 203, price: 1 }, 100)).toEqual({ rentEnabled: false, errorCode: 203 });
    });
});

describe('RENTABLE_SPACE_ERROR_TEXTS', () => {
    it('maps every AIR error code to its rentablespace.widget key', () => {
        expect([...RENTABLE_SPACE_ERROR_TEXTS.keys()]).toEqual([100, 101, 102, 103, 200, 201, 202, 203, 300, 400]);

        for (const { key } of RENTABLE_SPACE_ERROR_TEXTS.values()) expect(key.startsWith('rentablespace.widget.error_reason_')).toBe(true);
    });
});
