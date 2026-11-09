import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readPngSize = (path: string) => {
    const png = readFileSync(path);

    return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

describe('Habbo Club catalog offer marker', () => {
    it('uses the compact marker and anchors it over the product corner', () => {
        const iconCss = readFileSync(join(process.cwd(), 'src/css/icons/icons.css'), 'utf8');
        const catalogCss = readFileSync(join(process.cwd(), 'src/css/catalog/CatalogView.css'), 'utf8');
        const iconRule = iconCss.match(/\.octane-icon\.icon-catalogue-hc_small\s*\{[^}]*\}/s)?.[0] ?? '';
        const markerRule = catalogCss.match(/\.octane-catalog-grid-club-level\s*\{[^}]*\}/s)?.[0] ?? '';

        expect(readPngSize(join(process.cwd(), 'src/assets/images/catalog/hc_small.png'))).toEqual({ width: 15, height: 15 });
        expect(iconRule).toMatch(/width:\s*15px;/);
        expect(iconRule).toMatch(/height:\s*15px;/);
        expect(markerRule).toMatch(/top:\s*4px;/);
        expect(markerRule).toMatch(/left:\s*23px;/);
    });
});
