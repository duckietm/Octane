import { describe, expect, it } from 'vitest';
import { fittingTabCount } from './handheldTabStrip';

describe('fittingTabCount', () => {
    it('shows as many tabs as fit, within one and the maximum', () => {
        expect(fittingTabCount(390 - 64, 46, 16)).toBe(7);
        expect(fittingTabCount(844 - 64, 46, 16)).toBe(16);
        expect(fittingTabCount(30, 46, 16)).toBe(1);
    });

    it('falls back to the maximum before the strip is measured', () => {
        expect(fittingTabCount(0, 46, 16)).toBe(16);
        expect(fittingTabCount(-64, 46, 7)).toBe(7);
    });
});
