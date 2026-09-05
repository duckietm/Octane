import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getCatalogGridMetrics } from './useCatalogDisplayPreferences';

describe('catalog grid personalization', () => {
    it('offers compact, standard and large layouts without changing offer data', () => {
        expect(getCatalogGridMetrics('compact')).toEqual({ columnCount: 7, columnMinHeight: 64, columnMinWidth: 45 });
        expect(getCatalogGridMetrics('standard')).toEqual({ columnCount: 6, columnMinHeight: 74, columnMinWidth: 53 });
        expect(getCatalogGridMetrics('large')).toEqual({ columnCount: 5, columnMinHeight: 92, columnMinWidth: 68 });
    });

    it('falls back to the standard density for invalid stored values', () => {
        expect(getCatalogGridMetrics('invalid' as any)).toEqual({ columnCount: 6, columnMinHeight: 74, columnMinWidth: 53 });
    });

    it('keeps each density tile width while allowing responsive column counts', () => {
        const css = readFileSync(resolve(process.cwd(), 'src/css/catalog/CatalogExperience.css'), 'utf8');

        expect(css).toContain('--octane-grid-column-min-width: 53px');
        expect(css).toContain('--octane-grid-column-min-width: 45px');
        expect(css).toContain('--octane-grid-column-min-width: 68px');
    });
});
