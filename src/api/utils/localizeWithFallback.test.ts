import { describe, expect, it } from 'vitest';

import { resolveLocalized } from './localizeWithFallback';

/**
 * The localization manager returns the KEY itself when a translation is missing
 * (LocalizationManager.getValue → `value || key`). `resolveLocalized` turns that
 * "missing" signal into a caller-supplied fallback so raw keys like
 * `purse.seasonal.currency.11` never reach the UI.
 */
describe('resolveLocalized', () => {
    it('returns the localized text when it differs from the key', () => {
        expect(resolveLocalized('Pixels', 'purse.seasonal.currency.5', 'fallback')).toBe('Pixels');
    });

    it('returns the fallback when the text equals the key (missing translation)', () => {
        expect(resolveLocalized('purse.seasonal.currency.11', 'purse.seasonal.currency.11', '')).toBe('');
        expect(resolveLocalized('purse.seasonal.currency.11', 'purse.seasonal.currency.11', 'Currency')).toBe('Currency');
    });

    it('returns the fallback for empty / null text', () => {
        expect(resolveLocalized('', 'some.key', 'FB')).toBe('FB');
        expect(resolveLocalized(null, 'some.key', 'FB')).toBe('FB');
    });
});
