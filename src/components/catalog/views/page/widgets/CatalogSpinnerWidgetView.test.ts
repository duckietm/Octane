/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { clampCatalogPurchaseQuantity } from './CatalogSpinnerWidgetView';

describe('catalog purchase quantity', () => {
    it('clamps typed quantities to the supported 1 through 100 range', () => {
        expect(clampCatalogPurchaseQuantity(Number.NaN)).toBe(1);
        expect(clampCatalogPurchaseQuantity(0)).toBe(1);
        expect(clampCatalogPurchaseQuantity(37)).toBe(37);
        expect(clampCatalogPurchaseQuantity(37.8)).toBe(37);
        expect(clampCatalogPurchaseQuantity(101)).toBe(100);
    });
});
