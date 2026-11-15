import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

// These controls drop the browser's outline in their base rule; each keeps a ring for the keyboard.
describe('keyboard focus rings on controls that remove the outline', () => {
    it.each([
        ['src/css/achievements/AchievementsView.css', '.octane-achievements-air .air-achievement-tile:focus-visible'],
        ['src/css/catalog/CatalogGiftView.css', '.octane-catalog-gift-arrow:focus-visible'],
        ['src/css/catalog/CatalogGiftView.css', '.octane-catalog-gift-palette-item:focus-visible'],
        ['src/css/catalog/CatalogGiftView.css', '.octane-catalog-gift-submit:focus-visible'],
        ['src/css/friends/FriendsView.css', '.friend-bar .friend-bar-friend.is-selected .friend-bar-action-icon:focus-visible']
    ])('%s: %s', (file, selector) => {
        const css = read(file).replace(/\r\n/g, '\n');
        const at = css.indexOf(`${selector} {`) >= 0 ? css.indexOf(`${selector} {`) : css.indexOf(`${selector},`);

        expect(at).toBeGreaterThanOrEqual(0);
        expect(css.slice(at, css.indexOf('}', at))).toContain('outline: 1px dotted #000000;');
    });
});
