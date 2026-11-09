import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const css = read('src/css/ads/GoogleAdsAirText.css');
const view = read('src/components/ads/GoogleAdsView.tsx');

describe('sponsored window text (AIR conventions)', () => {
    it('is regular Ubuntu 12 px black, hints u_italic #666666', () => {
        expect(view).toContain("import '../../css/ads/GoogleAdsAirText.css';");
        expect(view).not.toContain('text-gray-500');
        expect(css).toMatch(/\.octane-google-ads \.octane-card-content-shell \{[^}]*color: #000000;[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif;[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-google-ads__hint \{[^}]*color: #666666;[^}]*font-size: 12px;[^}]*font-style: italic/);
    });
});
