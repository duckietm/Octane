import { describe, expect, it } from 'vitest';
import { formatCurrencyChange } from './currencyChange';

describe('formatCurrencyChange', () => {
    it('signs gains with a plus and losses with a minus', () => {
        expect(formatCurrencyChange(10, 15)).toBe('+5');
        expect(formatCurrencyChange(10, 3)).toBe('-7');
    });

    it('stays silent for the first load and for unchanged balances', () => {
        expect(formatCurrencyChange(null, 15)).toBeNull();
        expect(formatCurrencyChange(15, 15)).toBeNull();
        expect(formatCurrencyChange(Number.NaN, 15)).toBeNull();
    });
});
