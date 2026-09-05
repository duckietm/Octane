import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const catalogCss = readFileSync(resolve(process.cwd(), 'src/css/catalog/CatalogView.css'), 'utf8');
const experienceCss = readFileSync(resolve(process.cwd(), 'src/css/catalog/CatalogExperience.css'), 'utf8');

afterEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
});

describe('responsive catalog item grid', () => {
    it('uses the selected tile width to add columns when the catalog expands', () => {
        const stylesheet = document.createElement('style');
        const grid = document.createElement('div');

        stylesheet.textContent = `${catalogCss}\n${experienceCss}`;
        grid.className = 'octane-catalog-grid octane-catalog-grid-density-standard';
        document.head.append(stylesheet);
        document.body.append(grid);

        const style = getComputedStyle(grid);

        expect(style.getPropertyValue('--octane-grid-column-min-width').trim()).toBe('53px');
        expect(style.gridTemplateColumns.replaceAll(' ', '')).toBe('repeat(var(--octane-air-column-count,6),53px)');
    });

    it('keeps the last column clear of the visible classic scrollbar', () => {
        const stylesheet = document.createElement('style');
        const scrollArea = document.createElement('div');
        const viewport = document.createElement('div');
        const scrollbar = document.createElement('div');

        stylesheet.textContent = `${catalogCss}\n${experienceCss}`;
        scrollArea.className = 'octane-classic-scroll-area octane-catalog-item-grid-scroll-area';
        viewport.className = 'octane-classic-scroll-area-viewport';
        scrollbar.className = 'octane-classic-scrollbar';
        scrollbar.dataset.visible = 'true';
        scrollArea.append(viewport, scrollbar);
        document.head.append(stylesheet);
        document.body.append(scrollArea);

        expect(getComputedStyle(viewport).paddingRight).toBe('17px');
    });

    it('keeps virtualized catalog columns clear of the visible classic scrollbar', () => {
        const stylesheet = document.createElement('style');
        const virtualGrid = document.createElement('div');
        const scrollArea = document.createElement('div');
        const viewport = document.createElement('div');
        const scrollbar = document.createElement('div');

        stylesheet.textContent = `${catalogCss}\n${experienceCss}`;
        virtualGrid.className = 'octane-catalog-grid-virtual';
        scrollArea.className = 'octane-classic-scroll-area';
        viewport.className = 'octane-classic-scroll-area-viewport';
        scrollbar.className = 'octane-classic-scrollbar';
        scrollbar.dataset.visible = 'true';
        scrollArea.append(viewport, scrollbar);
        virtualGrid.append(scrollArea);
        document.head.append(stylesheet);
        document.body.append(virtualGrid);

        expect(getComputedStyle(viewport).paddingRight).toBe('17px');
    });

    it('keeps auto-fill active at the compact catalog breakpoint', () => {
        const compactRule =
            catalogCss.match(/@media \(max-width: 640px\)[\s\S]*?\.octane-catalog-grid:not\(\.octane-catalog-grid-density-standard\)\s*\{([^}]*)\}/)?.[1] ?? '';

        expect(compactRule.replaceAll(' ', '')).toContain('grid-template-columns:repeat(auto-fill,minmax(var(--octane-grid-column-min-width,47px),1fr))');
        expect(compactRule).not.toContain('--octane-air-column-count');
    });

    it('lets fixed-coordinate offer templates expose the full catalog width to auto-fill', () => {
        const stylesheet = document.createElement('style');
        const layout = document.createElement('div');
        const preview = document.createElement('div');
        const grid = document.createElement('div');
        const purchase = document.createElement('div');

        stylesheet.textContent = `${catalogCss}\n${experienceCss}`;
        layout.className = 'octane-catalog-pet-customization-layout';
        preview.className = 'octane-catalog-pet-customization-preview';
        grid.className = 'octane-catalog-pet-customization-grid';
        purchase.className = 'octane-catalog-pet-customization-purchase';
        layout.append(preview, grid, purchase);
        document.head.append(stylesheet);
        document.body.append(layout);

        expect(getComputedStyle(layout).width).toBe('100%');
        expect(getComputedStyle(preview).width).toBe('100%');
        expect(getComputedStyle(grid).width).toBe('100%');
        expect(getComputedStyle(purchase).width).toBe('100%');
    });
});
