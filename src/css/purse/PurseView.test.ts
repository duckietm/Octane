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

});
