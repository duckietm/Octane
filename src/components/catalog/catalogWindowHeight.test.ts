import { describe, expect, it } from 'vitest';
import { CATALOG_WINDOW_DEFAULT_HEIGHT, CATALOG_WINDOW_MIN_HEIGHT, clampCatalogWindowHeight } from './catalogWindowHeight';

describe('clampCatalogWindowHeight', () => {
    it('never lets the window drop under the layout minimum', () => {
        expect(clampCatalogWindowHeight(100, 1080)).toBe(CATALOG_WINDOW_MIN_HEIGHT);
        expect(clampCatalogWindowHeight(CATALOG_WINDOW_MIN_HEIGHT - 1, 1080)).toBe(CATALOG_WINDOW_MIN_HEIGHT);
    });

    it('keeps the bottom edge inside the viewport', () => {
        expect(clampCatalogWindowHeight(2000, 900)).toBe(900);
        expect(clampCatalogWindowHeight(700.4, 900)).toBe(700);
    });

    it('falls back to the official opening height for nonsense input', () => {
        expect(clampCatalogWindowHeight(Number.NaN, 900)).toBe(CATALOG_WINDOW_DEFAULT_HEIGHT);
        expect(clampCatalogWindowHeight(800, 0)).toBe(800);
    });
});
