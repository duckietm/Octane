import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('SnowWar official arena artwork', () => {
    const arena = readSource('src/components/game-center/views/snowwar/SnowWarArenaView.tsx');
    const gameTile = readSource('src/components/game-center/views/GameTileView.tsx');
    const leaderboard = readSource('src/components/game-center/views/snowwar/SnowWarLeaderboardView.tsx');
    const css = readSource('src/css/game-center/GameCenterView.css');
    const projectiles = readSource('src/api/snowwar/SnowWarProjectileAssets.ts');

    it('resolves the AIR Arctic Island backdrop and special machine layers from the configured image library', () => {
        expect(arena).toContain("GetConfigurationValue<string>('image.library.url'");
        expect(arena).toContain("getOfficialSnowWarAssetUrl('snst_bg_1_a_big.png')");
        expect(arena).toContain('s_snowball_machine_32_a_0_${snowballCount}.png');
        expect(arena).toContain('s_snowball_machine_32_b_0_${indicatorFrame}.png');
        expect(css).toContain('.snowwar-official-arctic-backdrop');
        expect(css).toContain('.snowwar-machine__official-body');
        expect(css).toContain('.snowwar-machine__official-indicator');
    });

    it('uses AIR game-session scale 32 for the whole room projection', () => {
        expect(arena).toContain('const AIR_GAME_CANVAS_SCALE = 32');
        expect(arena).toContain('const TILE_HALF_W = AIR_GAME_CANVAS_SCALE / (2 * ZOOM)');
        expect(arena).toContain('scale={SNOWWAR_FURNI_SCALE}');
        expect(arena).toContain('scale(${SNOWWAR_GAME_SPRITE_SCALE})');
        expect(css).not.toContain('transform: scale(0.75)');
    });

    it('keeps Duckie legacy editor props as an additive compatibility path', () => {
        expect(arena).toContain("sw_tree1: { image: 'sw_tree1.png', shadow: 'sw_tree1_shadow.png' }");
        expect(arena).toContain("obst_snowman: { image: 'obst_snowman.png' }");
        expect(arena).toContain("name.startsWith('sw_')");
    });

    it('uses the exported official pile sprite without restoring hand-drawn substitutes', () => {
        expect(arena).toContain("import snowballPileImage from '../../../../assets/images/snowstorm/original/snst_ballpile.png'");
        expect(arena).toContain("item.name === 'snst_ballpile'");
        expect(arena).not.toContain('drawSnowTree');
        expect(arena).not.toContain('SNOWWAR_PILE');
        expect(css).not.toContain('.snowwar-machine__ball');
    });

    it('uses the AIR snowball, shadow and three splash bitmaps without invented hit effects', () => {
        expect(projectiles.match(/png\('iVB/g)).toHaveLength(5);
        expect(arena).toContain('SNOWWAR_SNOWBALL_IMAGE');
        expect(arena).toContain('SNOWWAR_SPLASH_FRAMES');
        expect(css).toMatch(/\.snowwar-snowball__ball\s*\{[^}]*width: 14px;[^}]*height: 14px;[^}]*max-width: none;/s);
        expect(css).toMatch(/\.snowwar-snowball__shadow\s*\{[^}]*width: 14px;[^}]*height: 6px;[^}]*max-width: none;/s);
        expect(css).toContain('snowwar-splash-frame-3');
        expect(css).not.toContain('radial-gradient(circle at 35% 35%');
        expect(css).not.toContain('snowwar-tree-shake');
        expect(css).not.toContain('snowwar-hit-shake');
    });

    it('positions avatar names in the pre-zoom coordinate space', () => {
        expect(css).toMatch(/\.snowwar-avatar__name\s*\{[^}]*top: -22px;/s);
    });

    it('builds the weekly and all-time leaderboard from the official AIR artwork', () => {
        expect(leaderboard).toContain("getAssetUrl('leaderboard_bg')");
        expect(leaderboard).toContain("getAssetUrl('leaderboard_highlighter')");
        expect(leaderboard).toContain("getAssetUrl('leaderboard_divider')");
        expect(leaderboard).toContain("'left_blue' : 'left_black'");
        expect(leaderboard).toContain("'right_blue' : 'right_black'");
        expect(leaderboard).toContain('requestLeaderboard(true, leaderboard.scope');
        expect(leaderboard).toContain('requestLeaderboard(false, leaderboard.scope');
        // AIR snowwar_leaderboard also carries changeView / changeFriendsView / changeGroupView.
        expect(leaderboard).toContain("'snowwar.leaderboard.groups'");
        expect(gameTile).toContain("GetConfigurationValue<boolean>('games.highscores.enabled', true)");
    });
});
