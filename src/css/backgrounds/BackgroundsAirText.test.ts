import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/backgrounds/BackgroundsView.css'), 'utf8');
const view = readFileSync(join(process.cwd(), 'src/components/backgrounds/BackgroundsView.tsx'), 'utf8');

describe('profile background picker text (AIR conventions, no AIR layout)', () => {
    it('is regular Ubuntu with 12 px tabs', () => {
        expect(view).toContain('octane-backgrounds-window');
        expect(css).toMatch(/\.octane-backgrounds-window \{[^}]*HabboAirUbuntu[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-backgrounds-window :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif !important/);
        expect(css).toMatch(/\.octane-backgrounds-window \.octane-card-tab-item \{[^}]*font-size: 12px/);
    });

    it('sets the prompt as u_headline_small 14 px bold', () => {
        expect(view).toContain('octane-backgrounds-window__prompt');
        expect(css).toMatch(/\.octane-backgrounds-window__prompt \{[^}]*font-size: 14px;[^}]*font-weight: 700/);
    });
});
