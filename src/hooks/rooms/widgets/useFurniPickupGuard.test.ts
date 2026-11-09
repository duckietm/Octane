/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { BUILDERS_CLUB_FURNI_ID_MIN, TEMPORARY_FURNI_ID_MAX } from '../../../api/utils/FurniIdBand';
import { needsWarehouseConfirm } from './useFurniPickupGuard';

describe('needsWarehouseConfirm (official pickupObjectWithConfirmation)', () => {
    it('asks before picking up a Builders Club furni that is not in the warehouse', () => {
        expect(needsWarehouseConfirm(BUILDERS_CLUB_FURNI_ID_MIN, false, true)).toBe(true);
        expect(needsWarehouseConfirm(2147483647, undefined, true)).toBe(true);
    });

    it('picks up a warehouse furni straight away', () => {
        expect(needsWarehouseConfirm(BUILDERS_CLUB_FURNI_ID_MIN + 3, true, true)).toBe(false);
    });

    it('never asks for normal or temporary furni, or with the Builders Club catalogue off', () => {
        expect(needsWarehouseConfirm(1234, false, true)).toBe(false);
        expect(needsWarehouseConfirm(TEMPORARY_FURNI_ID_MAX, false, true)).toBe(false);
        expect(needsWarehouseConfirm(BUILDERS_CLUB_FURNI_ID_MIN, false, false)).toBe(false);
    });
});
