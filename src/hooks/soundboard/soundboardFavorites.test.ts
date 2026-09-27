import { describe, expect, it } from 'vitest';
import { normalizeFavoriteIds, toggleFavoriteId } from './soundboardFavorites';

describe('soundboard favourites', () => {
    it('keeps positive unique integer ids only', () => {
        expect(normalizeFavoriteIds([3, 3, -1, 0, 1.5, '4', 7])).toEqual([3, 7]);
        expect(normalizeFavoriteIds('nope')).toEqual([]);
    });

    it('adds at the end and removes on a second toggle', () => {
        expect(toggleFavoriteId([1, 2], 3)).toEqual([1, 2, 3]);
        expect(toggleFavoriteId([1, 2, 3], 2)).toEqual([1, 3]);
    });
});
