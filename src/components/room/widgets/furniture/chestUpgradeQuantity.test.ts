import { describe, expect, it } from 'vitest';
import { clampUpgradeQuantity } from './chestUpgradeQuantity';

describe('clampUpgradeQuantity', () => {
    it('keeps a pick that still fits', () => {
        expect(clampUpgradeQuantity(3, 8, 10)).toBe(3);
    });

    it('lowers a pick to the upgrades left after a purchase', () => {
        expect(clampUpgradeQuantity(5, 2, 10)).toBe(2);
    });

    it('never goes above the per-purchase limit or below one', () => {
        expect(clampUpgradeQuantity(12, 20, 10)).toBe(10);
        expect(clampUpgradeQuantity(4, 0, 10)).toBe(1);
    });
});
