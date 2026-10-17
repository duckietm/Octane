import { describe, expect, it } from 'vitest';

import { isSafeExternalUrl } from './isSafeExternalUrl';

/**
 * Guard for URLs opened from user-controlled content (chat links, external
 * image/photo links). Only plain web URLs may be opened — never script- or
 * data-bearing schemes that run in the opener's origin.
 */
describe('isSafeExternalUrl', () => {
    it('accepts http and https URLs', () => {
        expect(isSafeExternalUrl('http://example.com/path')).toBe(true);
        expect(isSafeExternalUrl('https://example.com/path?q=1#x')).toBe(true);
    });

    it('rejects javascript: URLs', () => {
        expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeExternalUrl('JavaScript:alert(1)')).toBe(false);
        expect(isSafeExternalUrl(' javascript:alert(1)')).toBe(false);
    });

    it('rejects data: and vbscript: URLs', () => {
        expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
        expect(isSafeExternalUrl('vbscript:msgbox(1)')).toBe(false);
    });

    it('rejects file: and other non-web schemes', () => {
        expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false);
        expect(isSafeExternalUrl('about:blank')).toBe(false);
    });

    it('rejects empty / malformed input', () => {
        expect(isSafeExternalUrl('')).toBe(false);
        expect(isSafeExternalUrl(null)).toBe(false);
        expect(isSafeExternalUrl('not a url')).toBe(false);
    });
});
