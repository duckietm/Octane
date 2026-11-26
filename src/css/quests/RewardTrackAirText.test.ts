import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/quests/RewardTrackView.css'), 'utf8');
const dialogCss = readFileSync(join(process.cwd(), 'src/css/quests/QuestsView.css'), 'utf8');

describe('reward track text (reward_track_main_xml, premium purchase confirmation)', () => {
    it('is regular Ubuntu, not the condensed `Ubuntu` face', () => {
        expect(css).toMatch(/@layer base \{\s*\.octane-reward-track :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu[^}]*!important/);
    });

    it('keeps the layout text sizes: title 18 bold, points 22 bold, task info name 17 bold, unclaimed count 11 bold', () => {
        expect(css).toMatch(/\.octane-reward-track-title \{[^}]*font-size: 18px;[^}]*font-weight: bold/);
        expect(css).toMatch(/\.octane-reward-track-points-value > span \{[^}]*font-size: 22px;[^}]*font-weight: bold/);
        expect(css).toMatch(/\.octane-reward-track-task-info-name \{[^}]*font-size: 17px;[^}]*font-weight: bold/);
        expect(css).toMatch(/\.octane-reward-track-unclaimed \{[^}]*color: #fff;[^}]*font-size: 11px;[^}]*font-weight: bold/);
    });

    it('fixes the frame at 1103x722 with a 1097x683 content that never scrolls, the stage at (9, 8) like Volt', () => {
        expect(css).toMatch(/\.draggable-window:has\(> \.octane-reward-track\) \{[^}]*width: 1103px;[^}]*height: 722px;/);
        expect(css).toMatch(/\.octane-card-shell\.octane-reward-track \{[^}]*width: 1103px !important;[^}]*height: 722px !important;/);
        expect(css).toMatch(
            /\.octane-reward-track \.octane-reward-track-content\.octane-card-content-shell \{[^}]*width: 1097px;[^}]*height: 683px;[^}]*padding: 0 !important;[^}]*overflow: visible !important;/
        );
        expect(css).toMatch(/\.octane-reward-track-stage \{[^}]*position: absolute;[^}]*left: 9px;[^}]*top: 8px;[^}]*width: 1079px;[^}]*height: 667px;/);
    });

    it('wraps the tip inside its 265px field and cuts it there, so it never runs under Frank & Piccolo', () => {
        expect(css).toMatch(/\.octane-reward-track-tip-text \{[^}]*width: 265px;[^}]*height: 30px;[^}]*padding: 0 2px;[^}]*overflow: hidden;[^}]*line-height: 13\.5px;/);
        expect(css).toMatch(/\.octane-reward-track-tip-premium \.octane-reward-track-tip-text \{\s*width: 227px;/);
    });

    it('colours the premium confirmation texts like the layout', () => {
        expect(dialogCss).toMatch(/\.octane-reward-track-premium-title \{[^}]*color: #5d2c82;[^}]*font-size: 14px/);
        expect(dialogCss).toMatch(/\.octane-reward-track-premium-info \{[^}]*color: #4d3559;[^}]*font-size: 11px/);
        expect(dialogCss).toMatch(/\.octane-reward-track-premium-desc \{[^}]*color: #2d1f35;[^}]*font-size: 12px;[^}]*font-weight: 700/);
        expect(dialogCss).toMatch(/\.octane-reward-track-premium-benefit \{[^}]*font-size: 11px/);
    });

    it('skins hint_redirect_btn as the grey shiny button and cancel_button grey, confirm_button tinted 0xb265ce', () => {
        expect(css).toMatch(
            /\.octane-reward-track-button\.octane-reward-track-hint-button \{[^}]*border-image-source: var\(--habbo-skin-shiny\);[^}]*color: #000000;[^}]*font-size: 12px;[^}]*font-weight: 400;/
        );
        expect(dialogCss).toMatch(
            /\.octane-reward-track-premium \.octane-reward-track-premium-cancel \{\s*border-image-source: var\(--habbo-skin-shiny\) !important;/
        );
        expect(dialogCss).toMatch(
            /\.octane-reward-track-premium \.octane-reward-track-premium-buy\.habbo-btn-primary \{\s*border-image-source: var\(--habbo-skin-shiny-tint-b265ce\) !important;\s*color: #ffffff !important;/
        );
        expect(dialogCss).toMatch(
            /\.octane-reward-track-premium-buy\.habbo-btn-primary:hover \{\s*border-image-source: var\(--habbo-skin-shiny-tint-b265ce-hover\)/
        );
        expect(dialogCss).toMatch(
            /\.octane-reward-track-premium-buy\.habbo-btn-primary:active \{\s*border-image-source: var\(--habbo-skin-shiny-tint-b265ce-pressed\)/
        );
    });
});
