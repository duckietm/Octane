import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/quests/QuestsView.css'), 'utf8');

describe('daily tasks text (dailytasks, dailytasks_unclaimed)', () => {
    it('is regular Ubuntu, not the condensed `Ubuntu` face', () => {
        expect(css).toMatch(/:where\([^)]*\.octane-daily-tasks[^)]*\) :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu[^}]*!important/);
    });

    it('draws task_title_txt 13 bold white, the completion 12 bold 0x24850b and the reward amount 11 bold white', () => {
        expect(css).toMatch(/\.octane-daily-task-title \{[^}]*color: #fff;[^}]*font-weight: bold;[^}]*font-size: 13px/);
        expect(css).toMatch(/\.octane-daily-task-complete \{[^}]*color: #24850b;[^}]*font-weight: bold;[^}]*font-size: 12px/);
        expect(css).toMatch(/\.octane-daily-task-reward-amount \{[^}]*color: #fff;[^}]*font-size: 11px;[^}]*font-weight: bold/);
    });

    it('draws the progress text 12 bold and the unclaimed button 12 regular', () => {
        expect(css).toMatch(/\.octane-daily-task-progress \{[^}]*font-size: 12px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-daily-tasks \.octane-daily-tasks-unclaimed-button,[^{]*\{\s*font-size: 12px !important;\s*font-weight: 400 !important;/);
    });

    it('skins unclaimed_btn as the grey plain button (style 3, habbo_skin_button_shiny)', () => {
        expect(css).toMatch(/\.octane-daily-tasks \.octane-daily-tasks-unclaimed-button,\s*\.octane-reward-track-premium \.octane-reward-track-premium-cancel \{\s*border-image-source: var\(--habbo-skin-shiny\) !important;/);
    });

    it('tints claim_button 0x01a101 on the plain shiny skin as AIR', () => {
        expect(css).toMatch(
            /\.octane-daily-tasks \.octane-daily-task-claim\.habbo-btn-primary \{\s*border-image-source: var\(--habbo-skin-shiny-tint-01a101\) !important;\s*color: #ffffff !important;/
        );
        expect(css).toMatch(/\.octane-daily-task-claim\.habbo-btn-primary:is\(:disabled, \.pointer-events-none\) \{\s*border-image-source: var\(--habbo-skin-shiny-tint-01a101-disabled\)/);
    });
});
