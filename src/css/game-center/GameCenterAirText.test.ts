import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/game-center/GameCenterView.css'), 'utf8');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('game center text (games_main, snowwar_ending, snowwar_leaderboard)', () => {
    it('is regular Ubuntu everywhere but keeps the outlined captions on their own faces', () => {
        expect(css).not.toMatch(/font-family: Ubuntu,/);
        expect(css).toMatch(/:is\(\.game-center-main, \.snowwar-overlay, \.snowwar-leaderboard-overlay, \.snowwar-toast\) :where\(\*\):not\(svg, svg \*, \.snowwar-stroke\) \{[^}]*HabboAirUbuntu/);
        expect(rule('.snowwar-stroke')).toContain('font-family: SnowWarUbuntuBold');
    });

    it('uses the games_main sizes on the SnowWar tile', () => {
        expect(rule('.game-tile__link')).toMatch(/font-size: 14px;[^}]*font-weight: 700/);
        expect(rule('.game-tile__games-left')).toContain('font-size: 14px');
        expect(rule('.game-tile__games-left-count')).toContain('font-size: 20px');
        expect(rule('.game-tile__vip')).toContain('text-decoration: underline');
        expect(rule('.game-tile__actions .game-tile__play')).toContain('font-size: 20px');
        expect(rule('.snowwar-instructions__text')).toMatch(/font-size: 16px;[^}]*font-weight: 700/);
        expect(rule('.snowwar-teams__cancel')).toMatch(/font-size: 12px;[^}]*font-weight: 400/);
    });

    it('uses the snowwar_ending and leaderboard sizes', () => {
        expect(rule('.snowwar-results__team-score')).toContain('font-size: 24px');
        expect(rule('.snowwar-results__player-name')).toContain('font-size: 14px');
        expect(rule('.snowwar-results__stat')).toContain('font-weight: 700');
        expect(rule('.snowwar-results__stat')).not.toContain('text-transform');
        expect(rule('.snowwar-results__spotlight-title')).toContain('font-size: 17px');
        expect(rule('.snowwar-results__spotlight-name')).toContain('font-size: 14px');
        expect(rule('.snowwar-loading__status')).toContain('font-size: 17px');
        expect(rule('.snowwar-leaderboard-frame__title')).toMatch(/font-size: 12px;[^}]*font-weight: 700/);
        expect(rule('.snowwar-leaderboard__reset')).toContain('font-weight: 700');
    });

    it('draws the play button and the snowwar_ending buttons on the green shiny thick skin', () => {
        expect(css).toMatch(/\.game-tile__actions \.game-tile__play,\s*\.snowwar-results__buttons \.snowwar-button \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick-green\);[^}]*border-radius: 0;[^}]*background: transparent;/);
        expect(css).toMatch(/\.game-tile__play\.game-tile__play--blocked,\s*\.snowwar-results__buttons \.snowwar-button:disabled \{[^}]*--habbo-skin-shiny-thick-disabled/);
    });
});

