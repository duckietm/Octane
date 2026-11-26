import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const cssPath = join(process.cwd(), 'src/css/purse/PurseView.css');

describe('PurseView.css', () => {
    it('lets shortened currency tooltips escape the compact purse frame', () => {
        const css = readFileSync(cssPath, 'utf8');
        const purseBlock = css.match(/\.octane-purse\s*\{[^}]*\}/)?.[0] ?? '';

        expect(purseBlock).toContain('overflow: visible;');
    });

    it('paints AIR purse_xml chrome: style-9 frame, style-2 HC panels, 50x19 actions', () => {
        const css = readFileSync(cssPath, 'utf8');

        expect(css).toContain('border-ubuntu-9.png');
        expect(css).toContain('border-colorless-3b3933.png');
        expect(css).toContain('border-image-slice: 28 28 32 28 fill');
        expect(css).toContain('width: 230px');
        expect(css).toContain('height: 77px');
        expect(css).toContain('left: 64px');
        expect(css).toContain('left: 174px');
        expect(css).toContain('#00c1c4');
        expect(css).not.toContain('--habbo-skin-shiny');
        expect(css).not.toContain('.octane-purse::before');
        expect(css).toMatch(/\.octane-purse__col--actions\s*\{[^}]*gap:\s*2px;/s);
        expect(css).toMatch(/\.octane-purse__btn--join,\s*\n\.octane-purse__btn--earnings\s*\{[^}]*height:\s*28px;/s);
    });

    it('stacks the next purse item 2 px below the 76 px frame, as the AIR extension grid', () => {
        const css = readFileSync(cssPath, 'utf8');

        expect(css).toMatch(/\.octane-purse-container\s*\{[^}]*gap:\s*2px;/);
        expect(css).toMatch(/\.octane-purse\s*\{[^}]*height:\s*76px;/);
        expect(css).toMatch(/\.octane-purse__other\s*\{[^}]*gap:\s*2px;/);
        expect(css).not.toMatch(/\.octane-purse__other\s*\{[^}]*margin-top/);
    });

    it('clips a long balance at the left edge of the 52 px row: count field right edge at x 35, icon at (36, 2)', () => {
        const css = readFileSync(cssPath, 'utf8');

        expect(css).toMatch(/\.octane-purse-button__clip\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*overflow:\s*hidden;/);
        expect(css).toMatch(/\.octane-purse-button \.currency-text\s*\{[^}]*position:\s*absolute;[^}]*top:\s*2px;[^}]*right:\s*17px;/);
        expect(css).toMatch(/\.octane-purse-air-currency\s*\{[^}]*top:\s*2px;[^}]*left:\s*36px;/);
    });

    it('centres the 15 px logout and settings bitmaps at x 18, y 2 of the 50 x 19 buttons', () => {
        const css = readFileSync(cssPath, 'utf8');

        expect(css).toMatch(/\.octane-purse__btn--icon \.octane-purse__btn-img\s*\{[^}]*top:\s*-1px;[^}]*left:\s*15px;[^}]*width:\s*15px;[^}]*height:\s*15px;/);
    });

    it('lays the seasonal row out as purse_indicator_seasonal_xml: name (5,6) 105, amount (90,6) 60, 29 px badge at 163 with the icon at (3,3)', () => {
        const css = readFileSync(cssPath, 'utf8');

        expect(css).toMatch(/\.seasonal-text\s*\{[^}]*left:\s*5px;[^}]*width:\s*105px;/);
        expect(css).toMatch(/\.seasonal-amount\s*\{[^}]*left:\s*90px;[^}]*width:\s*60px;/);
        expect(css).toMatch(/\.seasonal-badge\s*\{[^}]*left:\s*163px;[^}]*width:\s*29px;[^}]*height:\s*29px;/);
        expect(css).toMatch(/\.seasonal-image\s*\{[^}]*top:\s*3px;[^}]*left:\s*3px;[^}]*width:\s*23px;[^}]*height:\s*23px;[^}]*object-fit:\s*scale-down;/);
        expect(css).toContain('border-6.png');
        expect(css).toContain('border-6-79756e.png');
    });
});
