/* @vitest-environment jsdom */
// Ported from plus-emulator/volt (by Dennis, GPL-3.0).
import { describe, expect, it } from 'vitest';
import { isCreditFurniExchangeHidden } from './useFurnitureExchangeWidget';

describe('isCreditFurniExchangeHidden', () => {
    it('opens the exchange window of CFC_ furni while the hotel redeems them (the default)', () => {
        expect(isCreditFurniExchangeHidden('CFC_500_goldbar', true)).toBe(false);
        expect(isCreditFurniExchangeHidden('CFC_500_goldbar', undefined)).toBe(false);
        expect(isCreditFurniExchangeHidden('CFC_500_goldbar', '1')).toBe(false);
    });

    it('keeps it shut for CFC_ furni once the hotel switches that off', () => {
        for (const setting of [false, 0, 'false', '0']) expect(isCreditFurniExchangeHidden('cfc_200', setting)).toBe(true);
    });

    it('never shuts it for other credit furni', () => {
        expect(isCreditFurniExchangeHidden('CF_50_goldbar', false)).toBe(false);
        expect(isCreditFurniExchangeHidden(null, false)).toBe(false);
    });
});
