import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const css = read('src/css/emustats/EmuStatsView.css');

describe('emulator stats text (AIR conventions)', () => {
    it('is regular Ubuntu, 12 px pure black body', () => {
        expect(css).toMatch(/\.octane-emustats \{[^}]*color: #000000;[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif;[^}]*font-size: 12px/);
        expect(css).toMatch(/@layer base \{\s*\.octane-emustats :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/\.octane-emustats-window \{\s*--octane-card-text: #000000;/);
    });

    it('uses 16 / 14 px bold titles and 11 px #666666 meta text', () => {
        expect(css).toMatch(/\.octane-emustats__header h1 \{[^}]*font-size: 16px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-emustats__section-header h3 \{[^}]*font-size: 14px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-emustats \.octane-emustats__metric-card small \{[^}]*font-size: 11px;[^}]*color: #666666/);
        expect(css).not.toMatch(/font-weight: 800/);
    });

    it('draws Refresh as the grey button_thick with black text', () => {
        expect(css).toMatch(/\.octane-emustats__refresh-button \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick\);[^}]*color: #000000;[^}]*font-size: 12px;[^}]*font-weight: 700/);
    });
});
