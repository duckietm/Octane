import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('club membership catalog layout', () => {
    it('matches the AIR vip_buy geometry and integrated offer actions', () => {
        const css = readFileSync(join(process.cwd(), 'src/css/catalog/CatalogVipBuyView.css'), 'utf8');
        const teaser = css.match(/\.octane-club-teaser\s*\{([^}]+)\}/)?.[1] ?? '';
        const introCopy = css.match(/\.octane-club-vip-copy\s*\{([^}]+)\}/)?.[1] ?? '';
        const offers = css.match(/\.octane-club-vip-offers\s*\{([^}]+)\}/)?.[1] ?? '';
        const wideOffer = css.match(/\.octane-club-offer\.is-wide\s*\{([^}]+)\}/)?.[1] ?? '';

        expect(teaser).toContain('top: 3px');
        expect(teaser).toContain('left: 3px');
        expect(teaser).toContain('width: 152px');
        expect(teaser).toContain('height: 291px');
        expect(teaser).toContain('object-fit: none');
        expect(introCopy).toContain('left: 161px');
        expect(introCopy).toContain('width: 198px');
        expect(introCopy).toContain('text-align: center');
        expect(offers).toContain('left: 19px');
        expect(offers).toContain('top: 170px');
        expect(offers).toContain('width: 336px');
        expect(offers).toContain('height: 257px');
        expect(offers).toContain('overflow: hidden');
        expect(wideOffer).toContain('width: 320px');
        expect(wideOffer).toContain('height: 75px');
        expect(css).toContain('left: 225px');
        expect(css).toContain('border-image-source: var(--habbo-skin-shiny-thick-green)');
    });

});
