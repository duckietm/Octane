import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/badges/BadgeLeaderboardView.css'), 'utf8');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('badge leaderboard text (main_view)', () => {
    it('uses the regular Ubuntu cut on the window and its portalled menu', () => {
        expect(css).toContain('.octane-badge-leaderboard :where(*):not(svg, svg *)');
        expect(css).toContain('.octane-badge-leaderboard__category-menu :where(*):not(svg, svg *)');
    });

    it('uses the AIR text styles', () => {
        expect(rule('.octane-badge-leaderboard__header-title')).toContain('font-size: 16px');
        expect(rule('.octane-badge-leaderboard__info-text')).toContain('font-size: 11px');
        expect(rule('.octane-badge-leaderboard__info-text')).toContain('color: #222222');
        expect(rule('.octane-badge-leaderboard__rank')).toContain('font-size: 15px');
        expect(rule('.octane-badge-leaderboard__username')).toContain('font-size: 12px');
        expect(rule('.octane-badge-leaderboard__username')).toContain('font-weight: 400');
        expect(rule('.octane-badge-leaderboard__score')).toContain('font-size: 12px');
        expect(rule('.octane-badge-leaderboard__score')).toContain('font-weight: 700');
        expect(rule('.octane-badge-leaderboard__nav-button')).toContain('font-size: 12px');
        expect(rule('.octane-badge-leaderboard__category-option')).toContain('font-size: 12px');
    });

    it('draws previous_btn / next_btn on the grey shiny skin and the body texts black', () => {
        expect(rule('.octane-badge-leaderboard__nav-button')).toContain('border-image-source: var(--habbo-skin-shiny)');
        expect(rule('.octane-badge-leaderboard__nav-button')).toContain('color: #000000');
        expect(rule('.octane-badge-leaderboard__nav-button')).not.toContain('linear-gradient');
        expect(rule('.octane-badge-leaderboard__category-option')).toContain('color: #000000');
        expect(rule('.octane-badge-leaderboard__content')).toContain('color: #000000');
    });
});

