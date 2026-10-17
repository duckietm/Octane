import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    LocalizeText: (key: string) => key,
    SendMessageComposer: vi.fn()
}));

import { getPetPackageNameError } from './usePetPackageWidget';

describe('getPetPackageNameError', () => {
    it('returns empty string for code 0 (no error)', () => {
        expect(getPetPackageNameError(0)).toBe('');
    });

    it('returns empty string for falsy values (null/undefined coerced)', () => {
        expect(getPetPackageNameError(null)).toBe('');
        expect(getPetPackageNameError(undefined as never)).toBe('');
    });

    it('maps the four documented error codes to their localization keys', () => {
        expect(getPetPackageNameError(1)).toBe('catalog.alert.petname.long');
        expect(getPetPackageNameError(2)).toBe('catalog.alert.petname.short');
        expect(getPetPackageNameError(3)).toBe('catalog.alert.petname.chars');
        expect(getPetPackageNameError(4)).toBe('catalog.alert.petname.bobba');
    });

    it('falls back to the bobba label for unknown error codes (defensive default)', () => {
        expect(getPetPackageNameError(99)).toBe('catalog.alert.petname.bobba');
        expect(getPetPackageNameError(-1)).toBe('catalog.alert.petname.bobba');
    });
});
