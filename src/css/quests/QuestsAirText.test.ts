import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/quests/QuestsView.css'), 'utf8');

describe('quests list text (Quests, Quest)', () => {
    it('is regular Ubuntu, not the condensed `Ubuntu` face', () => {
        expect(css).toMatch(/\.octane-quests,\s*\.octane-quest-details,[^{]*\{[^}]*HabboAirUbuntu/);
        expect(css).toMatch(/:where\(\.octane-quests, \.octane-quest-details, [^)]*\) :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu[^}]*!important/);
    });

    it('draws the campaign header 12 bold, the quest header 13 bold and the delay 13 bold 0x0090bd', () => {
        expect(css).toMatch(/\.octane-quest-campaign-header \{[^}]*font-weight: bold;[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-quest-block-header \{[^}]*color: #373737;[^}]*font-weight: bold;[^}]*font-size: 13px/);
        expect(css).toMatch(/\.octane-quest-delay \{[^}]*color: #0090bd;[^}]*font-size: 13px/);
    });

    it('keeps the hint, links, delay caption and hc info at Ubuntu 12 black', () => {
        expect(css).toMatch(/\.octane-quest-hint \{[^}]*color: #000;[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-quest-link \{[^}]*font-size: 12px;[^}]*color: #000/);
        expect(css).toMatch(/\.octane-quest-delay-desc \{[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-quests-hc-text \{[^}]*color: #000;[^}]*font-size: 12px/);
    });

    it('sizes the button_thick captions 12 px bold over the important Tailwind button size', () => {
        expect(css).toMatch(/@layer base \{[\s\S]*\.octane-quests-get-hc, \.octane-quest-accept[\s\S]*?\{\s*font-size: 12px !important;\s*font-weight: 700 !important;/);
    });

    it('skins accept_button and the completed dialog buttons as the grey button_thick, black text', () => {
        expect(css).toMatch(/\.octane-quest-completed \.octane-quest-completed-button \{\s*min-height: 29px !important;\s*border-image-source: var\(--habbo-skin-shiny-thick\) !important;/);
        expect(css).toMatch(/:where\(\.octane-quests, \.octane-quest-details\) \.octane-quest-accept,[^{]*\{[^}]*border-image-slice: 5 fill !important;[^}]*color: #000000 !important;/);
        expect(css).toMatch(/\.octane-quest-completed \.octane-quest-completed-button \{\s*font-size: 12px !important;\s*font-weight: 700 !important;/);
    });

    it('keeps the green skin only where AIR has style 5 (get_hc_btn)', () => {
        expect(css).not.toMatch(/\.octane-quests-get-hc[^{]*\{[^}]*--habbo-skin-shiny-thick\)/);
    });

    it('tints get_hc_btn 0x01a101 on the shiny thick skin as AIR', () => {
        expect(css).toMatch(
            /:where\(\.octane-quests, \.octane-daily-tasks\) \.octane-quests-get-hc\.habbo-btn-primary \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-01a101\) !important;\s*color: #ffffff !important;/
        );
        expect(css).toMatch(/\.octane-quests-get-hc\.habbo-btn-primary:hover \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-01a101-hover\)/);
    });
});
