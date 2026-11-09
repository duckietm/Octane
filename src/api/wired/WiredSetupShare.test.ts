import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/localizeWithFallback', () => ({
    localizeWithFallback: (key: string, fallback: string) => (key === 'wiredmenu.share.import.reason.tile' ? 'Deze tegel bestaat niet in deze kamer.' : fallback)
}));

import {
    isWiredShareCode,
    normalizeWiredShareCode,
    wiredImportEntryText,
    wiredImportReasonText,
    wiredShareErrorText,
    wiredShareFileName
} from './WiredSetupShare';

describe('WiredSetupShare', () => {
    it('strips the whitespace a pasted code picks up', () => {
        expect(normalizeWiredShareCode(' OWS1:ab\ncd \t')).toBe('OWS1:abcd');
        expect(isWiredShareCode('OWS1:abcd')).toBe(true);
        expect(isWiredShareCode('OWS1:')).toBe(false);
        expect(isWiredShareCode('hello')).toBe(false);
        expect(isWiredShareCode(`OWS1:${'A'.repeat(65000)}`)).toBe(false);
    });

    it('localizes refusal keys and shows plain server messages as they are', () => {
        expect(wiredImportReasonText('wiredmenu.share.import.reason.tile')).toBe('Deze tegel bestaat niet in deze kamer.');
        expect(wiredImportReasonText('Delay too long')).toBe('Delay too long');
        expect(wiredImportReasonText('')).toBe('');
    });

    it('names every status', () => {
        expect(wiredShareErrorText(5)).toBe('This is not a valid wired code.');
        expect(wiredShareErrorText(99)).toBe('Error 99');
        expect(wiredImportEntryText(2)).toBe('From inventory');
    });

    it('saves the code under a room file name', () => {
        expect(wiredShareFileName(42)).toBe('wired-room-42.owired.txt');
        expect(wiredShareFileName(NaN)).toBe('wired-room-0.owired.txt');
    });
});
