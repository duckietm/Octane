import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/room/FurniWindowsCAir.css'), 'utf8');
const vimeoCss = readFileSync(join(process.cwd(), 'src/css/room/VimeoDisplay.css'), 'utf8');

describe('furni windows text (video_viewer, playlisteditor, craftingwidget, wired chests, boygirl, area_hide_ui)', () => {
    it('sets the Ubuntu windows in regular Ubuntu, also over the condensed face of their children', () => {
        expect(css).toMatch(/\.octane-room-widget-area-hide \.octane-card-content-shell \{[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/@layer base \{[\s\S]*\[class\*='octane-widget-chest'\] \.octane-card-content-shell :where\(\*\):not\(svg, svg \*\)[\s\S]*HabboAirUbuntu, UbuntuRegular, sans-serif !important/);
        expect(vimeoCss).toMatch(/\.octane-vimeo-viewer-content :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
    });

    it('draws the clothing change gate in Volter 9 px', () => {
        expect(css).toMatch(/\.octane-football-gate \.octane-card-content-shell \{[^}]*font-family: Volter[^}]*font-size: 9px/);
        expect(css).toMatch(/\.octane-football-gate \.octane-card-content-shell :where\(\*\):not\(svg, svg \*\) \{[^}]*Volter, monospace !important/);
    });

    it('uses the AIR sizes for the video, jukebox and crafting texts', () => {
        expect(css).toMatch(/\.empty-video \{[^}]*color: #ffffff;[^}]*font-size: 11px/);
        expect(vimeoCss).toMatch(/\.octane-vimeo-viewer-empty \{[^}]*font-size: 11px/);
        expect(css).toMatch(/\.octane-playlist__title \{[^}]*color: #ffffff;[^}]*font-size: 20px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-playlist__subtitle \{[^}]*font-size: 14px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-crafting__heading \{[^}]*font-size: 14px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-crafting__info \{[^}]*font-size: 11px;[^}]*font-weight: 700/);
    });

    it('uses the AIR sizes for the chest texts and buttons', () => {
        expect(css).toMatch(/\.octane-chest__btn:not\(\.octane-chest__btn--icon\) \{[^}]*font-size: 12px;[^}]*font-weight: 400/);
        expect(css).toMatch(/\.octane-chest__search-input \{[^}]*color: #666666;[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-chest__title \{[^}]*font-size: 14px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-chest__upgrade-error \{[^}]*color: #c42f3d;[^}]*font-weight: 700/);
    });

    it('draws the area hide texts as u_small with grey info lines', () => {
        expect(css).toMatch(/\.octane-room-widget-area-hide \.octane-card-content-shell \{\s*font-size: 10px/);
        expect(css).toMatch(/\.octane-area-hide__info \{[^}]*color: #999999/);
    });
});
