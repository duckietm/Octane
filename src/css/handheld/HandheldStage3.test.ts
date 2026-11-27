import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const SHEETS = ['HandheldSocial.css', 'HandheldProfile.css', 'HandheldProgress.css', 'HandheldFrames.css', 'HandheldRoomHud.css', 'HandheldDialogs.css'];

/** Splits a selector list on its top-level commas (not the ones inside :is() / :where()). */
const splitSelectorList = (list: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (const char of list) {
        if (char === '(') depth++;
        if (char === ')') depth--;
        if (char === ',' && depth === 0) {
            parts.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    return [...parts, current].map((selector) => selector.trim()).filter(Boolean);
};

/** Every selector of a flat stylesheet (these files have no nesting, media or keyframe blocks). */
const selectorsOf = (css: string): string[] =>
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap((match) => splitSelectorList(match[1]));

describe('phone layout, stage 3 stylesheets', () => {
    it.each(SHEETS)('%s only styles the phone layout', (sheet) => {
        const selectors = selectorsOf(read(`src/css/handheld/${sheet}`));

        expect(selectors.length).toBeGreaterThan(5);
        expect(selectors.filter((selector) => !selector.startsWith(':root[data-handheld'))).toEqual([]);
    });

    it('loads every sheet after the windows it adapts, before the scrollbar theme', () => {
        const entry = read('src/index.tsx');
        const imports = [...entry.matchAll(/import '([^']+\.css)'/g)].map((match) => match[1]);
        const base = imports.indexOf('./css/handheld/Handheld.css');

        for (const sheet of SHEETS) expect(imports.indexOf(`./css/handheld/${sheet}`)).toBeGreaterThan(base);
    });

    it('scales the fixed windows through the shared custom property', () => {
        const base = read('src/css/handheld/Handheld.css');
        const frames = read('src/css/handheld/HandheldFrames.css');

        expect(base).toMatch(/\[data-handheld-window='scaled'\] > \* \{[^}]*zoom: var\(--octane-handheld-scale, 1\)/);
        expect(frames).toMatch(/\.octane-air-modal__window\[data-handheld-scaled\] \{[^}]*zoom: var\(--octane-handheld-scale, 1\)/);
    });

    it('keeps phone text fields at 16 px, so mobile Safari does not zoom into them', () => {
        const social = read('src/css/handheld/HandheldSocial.css');

        expect(social).toMatch(/\.messenger-input-box input \{[^}]*font-size: 16px/);
        expect(social).toMatch(/\.hfl-search-form input \{[^}]*font-size: 16px/);
    });
});

describe('phone layout, stage 3 windows', () => {
    it.each([
        ['src/components/friends/views/friends-list/FriendsListView.tsx', 'handheldSheet'],
        ['src/components/friends/views/messenger/FriendsMessengerView.tsx', 'handheldSheet'],
        ['src/components/user-profile/UserProfileView.tsx', 'handheldSheet'],
        ['src/components/user-profile/ProfileCustomizeView.tsx', 'handheldSheet'],
        ['src/components/quests/QuestsView.tsx', 'handheldSheet'],
        ['src/components/quests/DailyTasksView.tsx', 'handheldSheet'],
        ['src/components/quests/RewardTrackView.tsx', 'handheldScale={HANDHELD_MIN_FRAME_SCALE}'],
        ['src/components/talent/TalentTrackView.tsx', 'handheldScale={HANDHELD_MIN_FRAME_SCALE}'],
        ['src/components/avatar-editor/AvatarEditorView.tsx', 'handheldScale={HANDHELD_TOUCH_FRAME_SCALE}'],
        ['src/components/achievements/AchievementsView.tsx', 'handheldScale={HANDHELD_TOUCH_FRAME_SCALE}']
    ])('%s fits the phone with %s', (path, prop) => {
        expect(read(path)).toContain(prop);
    });
});
