import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/toolbar/ToolBar.css'), 'utf8');

describe('toolbar text (bottom_bar_left, new_items_label, prog_menu_view)', () => {
    it('draws the new items label in u_small: 10 px regular white AIR Ubuntu', () => {
        expect(css).toMatch(/\.octane-toolbar-new-additions \{[^}]*color: #ffffff;[^}]*HabboAirUbuntu[^}]*font-size: 10px;[^}]*font-weight: 400/);
    });

    it('draws unseen counters as the red new_items_counter with an 11 px bold white count', () => {
        expect(css).toMatch(/\.octane-toolbar-count \{[^}]*background: #ee2924;[^}]*color: #ffffff;[^}]*HabboAirUbuntu[^}]*font-size: 11px;[^}]*font-weight: 700/);
        expect(css).toMatch(/@layer base \{\s*\/\*[^*]*\*\/\s*\.octane-toolbar-count \{[^}]*border-color: #000000 !important/);
    });

    it('puts the progression menu captions in regular AIR Ubuntu', () => {
        expect(css).toMatch(/\.octane-toolbar-progression \.octane-toolbar-progression-label \{[^}]*HabboAirUbuntu/);
    });
});
