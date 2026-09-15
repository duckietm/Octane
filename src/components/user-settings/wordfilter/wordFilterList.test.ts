import { describe, expect, it } from 'vitest';
import {
    applyWordFilterModifyResult,
    canAddWordFilterWord,
    mergeWordFilterList,
    WORD_FILTER_RESULT_ADDED,
    WORD_FILTER_RESULT_REMOVED,
    wordFilterRowColor
} from './wordFilterList';

describe('wordFilterList', () => {
    it('merges the server list into the local one without duplicates, keeping order', () => {
        expect(mergeWordFilterList(['pippo'], ['Pippo', 'pluto', 'pippo'])).toEqual(['pippo', 'pluto']);
        expect(mergeWordFilterList([], [])).toEqual([]);
    });

    it('applies the official modify results: 1 adds, 3 removes, anything else is a no-op', () => {
        expect(applyWordFilterModifyResult(['pippo'], WORD_FILTER_RESULT_ADDED, 'pluto')).toEqual(['pippo', 'pluto']);
        expect(applyWordFilterModifyResult(['pippo'], WORD_FILTER_RESULT_ADDED, 'PIPPO')).toEqual(['pippo']);
        expect(applyWordFilterModifyResult(['pippo', 'pluto'], WORD_FILTER_RESULT_REMOVED, 'Pippo')).toEqual(['pluto']);
        expect(applyWordFilterModifyResult(['pippo'], 0, 'pippo')).toEqual(['pippo']);
    });

    it('only lets a non-empty word that is not already listed be added', () => {
        expect(canAddWordFilterWord('  ', [])).toBe(false);
        expect(canAddWordFilterWord(' Pippo ', ['pippo'])).toBe(false);
        expect(canAddWordFilterWord('pluto', ['pippo'])).toBe(true);
    });

    it('paints rows like the AIR list: selected, hovered, then alternating', () => {
        expect(wordFilterRowColor(2, 2, true)).toBe('#9ab8d9');
        expect(wordFilterRowColor(1, -1, true)).toBe('#b6d9ff');
        expect(wordFilterRowColor(0, -1, false)).toBe('#e3e9e1');
        expect(wordFilterRowColor(1, -1, false)).toBe('#ffffff');
    });
});
