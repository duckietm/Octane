import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('current catalog layout geometry', () => {
    let styleElement: HTMLStyleElement;

    beforeAll(() => {
        styleElement = document.createElement('style');
        styleElement.textContent = readFileSync(join(process.cwd(), 'src/css/catalog/CatalogView.css'), 'utf8');
        document.head.appendChild(styleElement);
    });

    afterAll(() => styleElement.remove());

    const styleFor = (className: string, parentClassName = 'octane-catalog-badge-display-layout') => {
        const parent = document.createElement('div');
        const element = document.createElement('div');

        parent.className = `octane-catalog-window ${parentClassName}`;
        element.className = className;
        parent.appendChild(element);
        document.body.appendChild(parent);

        const style = getComputedStyle(element);
        const values = {
            bottom: style.bottom,
            height: style.height,
            left: style.left,
            maxWidth: style.maxWidth,
            padding: style.padding,
            right: style.right,
            top: style.top,
            width: style.width
        };

        parent.remove();

        return values;
    };

    it('matches the current badge display offer and badge selector regions', () => {
        expect(styleFor('octane-catalog-badge-product-picker')).toMatchObject({ left: '0px', top: '245px', width: '95px', height: '175px' });
        expect(styleFor('octane-catalog-badge-picker')).toMatchObject({ left: '105px', top: '245px', width: '255px', height: '175px' });
        expect(styleFor('octane-catalog-badge-search')).toMatchObject({ left: '0px', top: '0px', width: '255px', height: '26px' });
        expect(styleFor('octane-catalog-badge-scroll-area')).toMatchObject({ left: '0px', top: '30px', width: '255px', height: '145px' });
    });

    it('keeps the limited indicator at the current badge display coordinates', () => {
        expect(styleFor('octane-catalog-badge-limited', 'octane-catalog-badge-preview')).toMatchObject({
            left: '180px',
            top: '20px',
            width: '170px',
            height: '30px'
        });
    });

    it('leaves a full 70 pixel offer column beside the classic scrollbar', () => {
        expect(styleFor('octane-catalog-badge-product-picker')).toMatchObject({ padding: '3px' });
        expect(styleFor('octane-classic-scroll-area-viewport', 'octane-catalog-badge-product-picker')).toMatchObject({ width: '87px' });
    });

    it('lets the sound machine regions expand with the catalog while preserving their vertical geometry', () => {
        expect(styleFor('octane-catalog-sound-layout', 'octane-catalog-layout-container')).toMatchObject({ width: '100%', maxWidth: 'none', height: '460px' });
        expect(styleFor('octane-catalog-sound-product', 'octane-catalog-sound-layout')).toMatchObject({ left: '0px', top: '0px', width: '100%', height: '240px' });
        expect(styleFor('octane-catalog-sound-grid', 'octane-catalog-sound-layout')).toMatchObject({ left: '0px', top: '245px', width: '100%', height: '180px' });
        expect(styleFor('octane-catalog-sound-purchase', 'octane-catalog-sound-layout')).toMatchObject({ left: '0px', top: '430px', width: '100%', height: '30px' });
    });
});
