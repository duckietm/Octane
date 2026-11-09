import { describe, expect, it } from 'vitest';
import { parsePositiveId, parseSignId } from './parseCommandNumbers';

describe('parseSignId', () => {
    it('reads a sign the server accepts', () => {
        expect(parseSignId('0')).toBe(0);
        expect(parseSignId('17')).toBe(17);
    });

    it('refuses text, an empty argument and ids out of range', () => {
        expect(parseSignId('foo')).toBeNull();
        expect(parseSignId('')).toBeNull();
        expect(parseSignId(undefined)).toBeNull();
        expect(parseSignId('18')).toBeNull();
        expect(parseSignId('-1')).toBeNull();
    });
});

describe('parsePositiveId', () => {
    it('reads a positive id', () => {
        expect(parsePositiveId('42')).toBe(42);
    });

    it('refuses text, zero, negatives and decimals', () => {
        expect(parsePositiveId('abc')).toBeNull();
        expect(parsePositiveId('0')).toBeNull();
        expect(parsePositiveId('-5')).toBeNull();
        expect(parsePositiveId('1.5')).toBeNull();
        expect(parsePositiveId(undefined)).toBeNull();
    });
});
