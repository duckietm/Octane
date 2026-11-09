import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const css = read('src/css/housekeeping/HousekeepingView.css');
const parts = read('src/components/housekeeping/views/common/HousekeepingParts.tsx');

describe('housekeeping text (AIR conventions)', () => {
    it('is regular Ubuntu with pure black body text and an 11 px floor', () => {
        expect(css).toMatch(/\.octane-housekeeping \{[^}]*--octane-card-text: #000000;[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/@layer base \{[\s\S]*\.octane-housekeeping :where\(\*\):not\([^)]*\.octane-card-header-shell[^{]*\{[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif !important/);
        expect(css).toMatch(/:where\(\.text-\\\[9px\\\], \.text-\\\[10px\\\]\):not\(svg, svg \*\) \{[^}]*font-size: 11px !important/);
    });

    it('draws section titles 14 px bold black', () => {
        expect(css).toMatch(/\.octane-housekeeping \.hk-air-heading \{[^}]*font-size: 14px !important;[^}]*font-weight: 700/);
        expect(parts).toContain('hk-air-heading m-0 flex items-center gap-1 text-[14px] font-bold text-black');
        expect(parts).not.toMatch(/text-\[9px\]|text-\[10px\]/);
    });

    it('uses the grey button_thick with 12 px bold black text, red only for danger', () => {
        expect(css).toMatch(/\.octane-housekeeping \.hk-btn \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick\) !important;[^}]*color: #000000;[^}]*font-size: 12px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.hk-btn--danger:not\(:disabled\) \{[^}]*--habbo-skin-shiny-red/);
        expect(css).not.toMatch(/hk-btn--(primary|success)/);
        expect(css).not.toMatch(/border-image:\s*none/);
    });
});
