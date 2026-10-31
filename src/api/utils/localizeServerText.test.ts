import { describe, expect, it } from 'vitest';
import { localizeServerText, titleFromKey } from './localizeWithFallback';

describe('titleFromKey', () => {
    it('reads the last part of a key as a title', () => {
        expect(titleFromKey('navigator.flatcategory.global.TRADING')).toBe('Trading');
        expect(titleFromKey('navigator.flatcategory.global.ROLE_PLAY')).toBe('Role play');
    });
});

describe('localizeServerText', () => {
    it('never shows a ${key} as typed', () => {
        // the test localization has no such key: the readable fallback is used
        expect(localizeServerText('${navigator.flatcategory.global.GAMES}')).toBe('Games');
    });

    it('keeps plain text as it is', () => {
        expect(localizeServerText('Mijn kamers')).toBe('Mijn kamers');
        expect(localizeServerText('')).toBe('');
    });
});
