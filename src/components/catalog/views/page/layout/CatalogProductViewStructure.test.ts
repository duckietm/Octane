import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('standard catalog product view structure', () => {
    it('keeps the 360px product canvas intact and overlays product copy on it', () => {
        const layoutSource = readSource('src/components/catalog/views/page/layout/CatalogLayoutDefaultView.tsx');
        const experienceCss = readSource('src/css/catalog/CatalogExperience.css');

        expect(layoutSource).not.toContain('octane-catalog-offer-info');
        expect(layoutSource).toMatch(/octane-catalog-offer-preview[\s\S]*CatalogProductDetailsView/);
        expect(layoutSource).toMatch(/octane-catalog-preview-limited[\s\S]*CatalogLimitedItemWidgetView/);
        expect(experienceCss).not.toContain('238px');
        expect(experienceCss).toContain('.octane-catalog-preview-details');
        expect(experienceCss).toMatch(
            /octane-catalog-offer-preview:not\(\.is-badge\)[\s\S]*octane-catalog-product-details-description[\s\S]*color:\s*#fff\s*!important/
        );
        expect(experienceCss).toMatch(/octane-catalog-grid-shell\s*\{[\s\S]*bottom: 60px/);
        expect(experienceCss).toMatch(/octane-catalog-price-row\s*\{[\s\S]*bottom: 30px/);
        expect(experienceCss).toMatch(/octane-catalog-purchase-row\s*\{[\s\S]*bottom: 0/);
    });
});
