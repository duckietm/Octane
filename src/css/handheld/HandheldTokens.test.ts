import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const tokens = strip(read('src/css/handheld/HandheldTokens.css'));
const defined = new Set([...tokens.matchAll(/(--hh-[a-z0-9-]+):/g)].map((match) => match[1]));

/** The phone modules that wear the Octane handheld look, the frame the shop, the inventory, the avatar editor, the profile and the reward track share, and the drawer of whatever is selected in the room. */
const SHEETS = [
    'HandheldNavigator.css',
    'HandheldHud.css',
    'HandheldChat.css',
    'HandheldSheet.css',
    'HandheldCatalog.css',
    'HandheldInventory.css',
    'HandheldLooks.css',
    'HandheldProfile.css',
    'HandheldRewardTrack.css',
    'HandheldDrawer.css'
];

/** The sheets written wholly for the phone: every rule of theirs is scoped to it. */
const PHONE_ONLY = ['HandheldSheet.css', 'HandheldCatalog.css', 'HandheldInventory.css', 'HandheldLooks.css', 'HandheldProfile.css', 'HandheldRewardTrack.css', 'HandheldDrawer.css'];

/** Custom properties a sheet sets itself, on one of its own elements. */
const LOCAL = new Set(['--hh-level', '--hh-fill']);

/** The colours of our AIR windows that the palette is taken from, by where each lives. */
const AIR_SOURCES: [file: string, value: string, token: string][] = [
    ['src/css/habbo/HabboTheme.css', '--habbo-blue: #418db0', '--hh-air-blue: #418db0'],
    ['src/css/habbo/HabboTheme.css', '--habbo-blue-dark: #2e6f8a', '--hh-air-blue-deep: #2e6f8a'],
    ['src/css/habbo/HabboTheme.css', '--habbo-blue-header: #0e3f52', '--hh-air-blue-header: #0e3f52'],
    ['src/css/habbo/HabboTheme.css', '--habbo-select: #63c5e9', '--hh-air-select: #63c5e9'],
    ['src/css/habbo/HabboTheme.css', '--habbo-buy-bottom: #128818', '--hh-air-green-bottom: #128818'],
    ['src/css/habbo/HabboTheme.css', '--habbo-success: #00800b', '--hh-air-green-deep: #00800b'],
    ['src/css/habbo/HabboTheme.css', '--habbo-close: #921911', '--hh-air-red-deep: #921911'],
    ['src/css/habbo/HabboTheme.css', '--habbo-close-hover: #b9322a', '--hh-air-red: #b9322a'],
    ['src/css/catalog/CatalogView.css', '--catalog-standard-bg: #e9e9e1', '--hh-air-cream: #e9e9e1'],
    ['src/css/catalog/CatalogView.css', '--catalog-standard-box: #d2d1cb', '--hh-air-box: #d2d1cb'],
    ['src/css/catalog/CatalogView.css', '--catalog-standard-box-line: #757571', '--hh-air-box-line: #757571'],
    ['src/css/catalog/CatalogView.css', '--catalog-standard-text: #222222', '--hh-air-text: #222222'],
    ['src/css/quests/RewardTrackView.css', '--rt-dark: #3576b9', '--hh-air-track-blue: #3576b9'],
    ['src/css/quests/RewardTrackView.css', '--rt-light: #ddebf9', '--hh-air-track-light: #ddebf9'],
    ['src/css/quests/RewardTrackView.css', '--rt-band: #f9efe0', '--hh-air-track-free: #f9efe0'],
    ['src/css/quests/RewardTrackView.css', '--rt-band: #f1def7', '--hh-air-track-premium: #f1def7'],
    ['src/css/quests/RewardTrackView.css', '--rt-panel: #f5e1b9', '--hh-air-track-tip: #f5e1b9'],
    ['src/css/quests/RewardTrackView.css', '--rt-button: #b265ce', '--hh-air-premium: #b265ce']
];

describe('Octane handheld design tokens', () => {
    it('are only defined for the phone layout', () => {
        const selectors = [...tokens.matchAll(/([^{}]+)\{[^{}]*\}/g)].map((match) => match[1].trim()).filter((selector) => !selector.startsWith('@'));

        expect(defined.size).toBeGreaterThan(40);
        expect(selectors).toEqual([':root[data-handheld]', ':root[data-handheld]']);
    });

    it('are loaded before every phone stylesheet', () => {
        const imports = [...read('src/index.tsx').matchAll(/import '([^']+\.css)'/g)].map((match) => match[1]);
        const handheld = imports.filter((sheet) => sheet.startsWith('./css/handheld/'));

        expect(handheld[0]).toBe('./css/handheld/HandheldTokens.css');
    });

    it('take the palette from the colours of our AIR windows', () => {
        for (const [file, value, token] of AIR_SOURCES) {
            expect(read(file).toLowerCase(), `${file}: ${value}`).toContain(value);
            expect(tokens, token).toContain(`${token};`);
        }
    });

    it('switch the motion off for somebody who asked for less of it', () => {
        expect(tokens).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*:root\[data-handheld\] \{\s*--hh-fast: 0ms;/);
    });

    it.each(SHEETS)('%s reads its look from the tokens', (sheet) => {
        const css = strip(read(`src/css/handheld/${sheet}`));
        const used = [...css.matchAll(/var\((--hh-[a-z0-9-]+)/g)].map((match) => match[1]);

        // Every token a sheet asks for exists...
        expect([...new Set(used)].filter((name) => !defined.has(name) && !LOCAL.has(name))).toEqual([]);
        // ...the sheet leans on them for its colours, radii, sizes and timings...
        expect(used.length).toBeGreaterThan(sheet === 'HandheldSheet.css' ? 40 : 60); // the shared frame is a small sheet
        for (const family of ['--hh-air-', '--hh-radius-', '--hh-space-', '--hh-size-', '--hh-fast']) expect(used.some((name) => name.startsWith(family)), family).toBe(true);
        // ...and keeps no colour of its own in hex (white and black aside).
        expect([...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((match) => match[0].toLowerCase()).filter((hex) => !['#ffffff', '#000000'].includes(hex))).toEqual([]);
    });

    it.each(PHONE_ONLY)('%s only styles the phone layout, and hides no scrollbar', (sheet) => {
        const css = strip(read(`src/css/handheld/${sheet}`));
        const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap((match) => match[1].split(/,(?![^()]*\))/)).map((selector) => selector.trim());

        expect(selectors.length).toBeGreaterThan(20);
        expect(selectors.filter((selector) => !selector.startsWith(':root[data-handheld'))).toEqual([]);
        expect(css).not.toMatch(/scrollbar-width|::-webkit-scrollbar/);
    });

    it.each(SHEETS)('%s keeps its motion on the shared short timing', (sheet) => {
        const css = strip(read(`src/css/handheld/${sheet}`));
        const transitions = [...css.matchAll(/transition:([^;]+);/g)].map((match) => match[1]);

        expect(transitions.length).toBeGreaterThan(0);
        expect(transitions.filter((value) => !value.includes('var(--hh-fast)'))).toEqual([]);
    });
});
