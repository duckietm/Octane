import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    // Only the long name has a detailed text in this hotel.
    LocalizeText: (key: string, _names?: string[], values?: string[]) => (key === 'catalog.alert.petname.long.additionalInfo' ? `too long (max ${values?.[0]})` : key),
    SendMessageComposer: vi.fn()
}));

import { getPetPackageNameError } from './usePetPackageWidget.helpers';

describe('getPetPackageNameError', () => {
    it('returns empty string for code 0 (no error)', () => {
        expect(getPetPackageNameError(0)).toBe('');
    });

    it('returns empty string for falsy values (null/undefined coerced)', () => {
        expect(getPetPackageNameError(null as never)).toBe('');
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

    it("uses the detailed text with the server's detail where the hotel has one", () => {
        expect(getPetPackageNameError(1, '15')).toBe('too long (max 15)');
        // No detailed text for this one: the plain text.
        expect(getPetPackageNameError(3, '!?')).toBe('catalog.alert.petname.chars');
        expect(getPetPackageNameError(1, '')).toBe('catalog.alert.petname.long');
    });
});
