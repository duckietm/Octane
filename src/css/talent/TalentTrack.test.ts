import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/talent/TalentTrack.css'), 'utf8');

describe('talent track window (reward track look)', () => {
    it('fixes the frame at 800x580 with a 794x541 content that never scrolls, the stage at (9, 8)', () => {
        expect(css).toMatch(/\.octane-talent-track \.octane-air-modal__frame \{[^}]*width: 800px;[^}]*height: 580px;/);
        expect(css).toMatch(
            /\.octane-talent-track \.octane-air-modal__content\.octane-card-content-shell \{[^}]*width: 794px;[^}]*height: 541px;[^}]*padding: 0 !important;[^}]*overflow: hidden !important;/
        );
        expect(css).toMatch(/\.octane-talent-track__stage \{[^}]*left: 9px;[^}]*top: 8px;[^}]*width: 776px;[^}]*height: 524px;/);
    });

    it('sizes the level and task lists to whole rows of the reward track lists', () => {
        expect(css).toMatch(/\.octane-talent-levels > \.octane-talent-level-list \{[^}]*width: 280px;[^}]*height: 359px;/);
        expect(css).toMatch(/\.octane-talent-detail > \.octane-talent-task-list \{[^}]*width: 444px;[^}]*height: 193px;/);
        expect(css).toMatch(/\.octane-talent-task-list__content > \.octane-talent-task \{[^}]*width: 428px;[^}]*height: 61px;/);
        expect(css).toMatch(/\.octane-talent-level-list__content > \.octane-talent-level \{[^}]*width: 264px;[^}]*height: 44px;/);
    });

    it('draws the panels as border style 15 in the reward track palette', () => {
        expect(css).toMatch(/--rt-dark: #3576b9;[^}]*--rt-medium: #cfe2f9;[^}]*--rt-light: #ddebf9;[^}]*--rt-active: #bdd6ef;/);
        expect(css).toMatch(/border: 1px solid color-mix\(in srgb, var\(--rt-panel\) 80%, #000\);[^}]*border-radius: 5px;/);
        expect(css).toMatch(/\.octane-talent-level\[data-active='true'\] \{\s*--rt-panel: var\(--rt-active\);/);
    });

    it('sizes the register pane head to its 33 x 34 slot instead of the shared 90 x 130 avatar box', () => {
        const rule = css.match(/\.octane-talent-begin__avatar \.avatar-image\s*\{([^}]+)\}/)?.[1] ?? '';

        expect(rule).toContain('width: 100%');
        expect(rule).toContain('height: 100%');
    });

    it('skins the buttons as the grey shiny button of the reward track hint', () => {
        expect(css).toMatch(/\.octane-talent-button \{[^}]*border-image-source: var\(--habbo-skin-shiny\);[^}]*color: #000000;[^}]*font-size: 12px;/);
    });
});
