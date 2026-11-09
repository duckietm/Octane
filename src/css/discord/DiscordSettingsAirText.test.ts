import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const css = read('src/css/discord/DiscordSettingsAirText.css');
const view = read('src/components/discord/DiscordSettingsView.tsx');

describe('discord settings text (AIR conventions)', () => {
    it('is regular Ubuntu, 12 px pure black, and the view loads the sheet', () => {
        expect(view).toContain("import '../../css/discord/DiscordSettingsAirText.css';");
        expect(css).toMatch(/\.discord-settings-window \{[^}]*--octane-card-text: #000000;[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/\.discord-settings-window \.octane-card-content-shell \{[^}]*color: #000000;[^}]*font-size: 12px/);
    });

    it('has a 14 px bold section title and 11 px #666666 descriptions', () => {
        expect(css).toMatch(/\.discord-settings-section-title \{[^}]*font-size: 14px;[^}]*font-weight: 700/);
        expect(view).toContain('<Text className="text-[11px] text-[#666666]">');
        expect(view).not.toContain('uppercase tracking-wider');
    });

    it('draws the server links as the grey button_thick with black text', () => {
        expect(css).toMatch(/\.discord-settings-server-link \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick\) !important;[^}]*color: #000000;[^}]*font-size: 12px;[^}]*font-weight: 700/);
        expect(view).not.toContain('bg-[#5865F2] px-3 py-2 text-white');
    });
});
