import { describe, expect, it } from 'vitest';
import { getWiredPlaceholderNames } from './WiredPlaceholderInsert';

describe('message editor placeholders', () => {
    it('reads the placeholder names of the text-placeholder context', () => {
        const trigger = { contexts: [{ type: 0, hash: 1 }, { type: 7, placeholderNames: ['trigger_text', 'name'], capturerNames: ['price'] }] } as never;

        expect(getWiredPlaceholderNames(trigger)).toEqual(['trigger_text', 'name']);
    });

    it('offers nothing without that context', () => {
        expect(getWiredPlaceholderNames({ contexts: [] } as never)).toEqual([]);
        expect(getWiredPlaceholderNames(null)).toEqual([]);
    });
});
