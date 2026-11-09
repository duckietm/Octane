import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const css = read('src/css/room/FurniWindowsAAir.css');
const furnitureCss = read('src/css/widgets/FurnitureWidgets.css');
const widgets = 'src/components/room/widgets/furniture/';

describe('furni window text (AIR)', () => {
    it('is imported by every window it styles', () => {
        for (const view of [
            'FurnitureDimmerView',
            'FurnitureBackgroundColorView',
            'FurnitureStickieView',
            'FurnitureSpamWallPostItView',
            'FurnitureTrophyView',
            'FurnitureBadgeDisplayView',
            'FurnitureNikoTrophyView',
            'FurnitureMannequinView',
            'FurnitureStackHeightView'
        ]) {
            expect(read(`${widgets}${view}.tsx`)).toContain("import '../../../../css/room/FurniWindowsAAir.css';");
        }
    });

    it('draws the style 0 dimmer in Volter 9 px with regular buttons', () => {
        expect(css).toMatch(/\.octane-room-widget-dimmer :is\(\.octane-card-tabs-shell, \.octane-card-content-shell\) \{[^}]*font-family: Volter[^}]*font-size: 9px/);
        expect(css).toMatch(/\.octane-room-widget-dimmer \.octane-card-content-shell :where\(button\) \{[^}]*font-weight: 400/);
        expect(css).toMatch(/@layer base \{\s*\.octane-room-widget-dimmer :is\([^)]*\) :where\(\*\):not\(svg, svg \*\) \{[^}]*Volter, monospace !important/);
    });

    it('sets the toner in regular Ubuntu, u_small texts and Volter style 0 buttons', () => {
        expect(css).toMatch(/\.octane-room-widget-background-color :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/\.bgcolor-widget-info \{[^}]*font-size: 10px;[^}]*font-weight: 400/);
        expect(css).toMatch(/\.bgcolor-widget-label \{[^}]*font-size: 10px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.bgcolor-widget-button \{[^}]*Volter, monospace !important;[^}]*font-size: 9px !important;[^}]*font-weight: 400 !important/);
    });

    it('writes stickies in Volter 9 px, not italic', () => {
        expect(css).toMatch(/\.octane-stickie \.stickie-context textarea\.context-text \{[^}]*font-family: Volter[^}]*font-size: 9px;[^}]*font-style: normal/);
    });

    it('sets trophies, badge displays and the Niko trophy in regular Ubuntu 12 px', () => {
        expect(css).toMatch(/\.octane-layout-trophy \{[^}]*HabboAirUbuntu[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-layout-trophy :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/\.octane-niko-trophy-band \{[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-niko-trophy-link \{[^}]*color: #fff;[^}]*text-decoration: underline/);
    });

    it('gives the mannequin its 13 px texts and 12 px bold buttons', () => {
        const view = read(`${widgets}FurnitureMannequinView.tsx`);
        expect(view).toContain('octane-mannequin__name-input');
        expect(view).toContain('octane-mannequin__name octane-mannequin__name--peer');
        expect(css).toMatch(/\.octane-mannequin \.octane-mannequin__name \{[^}]*font-size: 13px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-mannequin__name--peer \{[^}]*font-style: italic/);
        expect(css).toMatch(/\.octane-mannequin__back \{[^}]*font-size: 13px/);
        expect(css).toMatch(/\.octane-mannequin :where\(\.habbo-btn-primary[^)]*\) \{[^}]*font-size: 12px !important;[^}]*font-weight: 700 !important/);
    });

    it('sets the stack height window in il_regular 11 px with il_button 10 px buttons', () => {
        expect(css).toMatch(/\.octane-widget-custom-stack-height \.octane-card-content-shell \{[^}]*font-size: 11px/);
        expect(css).toMatch(/\.octane-widget-custom-stack-height :where\(\.habbo-btn-primary[^)]*\) \{[^}]*font-size: 10px !important;[^}]*font-weight: 700 !important/);
    });

    it('keeps the photo viewer on id_regular, regular Ubuntu 11 px', () => {
        expect(furnitureCss).toMatch(/\.octane-photo-viewer \{[^}]*font-family: HabboAirUbuntu, UbuntuRegular, sans-serif;[^}]*font-size: 11px/);
    });
});
