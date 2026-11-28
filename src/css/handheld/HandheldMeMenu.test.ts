import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const selectorsOf = (css: string): string[] =>
    [...strip(css).matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap((match) => match[1].split(/,(?![^()]*\))/)).map((selector) => selector.trim());

const frames = strip(read('src/css/handheld/HandheldFrames.css'));
const windows = strip(read('src/css/handheld/HandheldWindows.css'));
const progress = strip(read('src/css/handheld/HandheldProgress.css'));
const settings = strip(read('src/css/handheld/HandheldSettings.css'));
const badges = strip(read('src/css/handheld/HandheldBadgeCreator.css'));
const talent = strip(read('src/css/handheld/HandheldTalent.css'));

/** The windows behind the toolbar's Me menu, as a phone shows them. */
describe('phone layout of the Me menu windows', () => {
    it.each(['HandheldFrames.css', 'HandheldWindows.css', 'HandheldProgress.css', 'HandheldSettings.css', 'HandheldBadgeCreator.css', 'HandheldTalent.css'])(
        '%s only styles the phone layout',
        (sheet) => {
            const selectors = selectorsOf(read(`src/css/handheld/${sheet}`));

            expect(selectors.length).toBeGreaterThan(5);
            expect(selectors.filter((selector) => !selector.startsWith(':root[data-handheld'))).toEqual([]);
        }
    );

    it('loads the new sheets after the frame they sit in', () => {
        const imports = [...read('src/index.tsx').matchAll(/import '([^']+\.css)'/g)].map((match) => match[1]);

        for (const sheet of ['HandheldSettings.css', 'HandheldBadgeCreator.css', 'HandheldTalent.css']) {
            expect(imports.indexOf(`./css/handheld/${sheet}`)).toBeGreaterThan(imports.indexOf('./css/handheld/HandheldSheet.css'));
        }

        expect(imports.indexOf('./css/handheld/HandheldSettings.css')).toBeGreaterThan(imports.indexOf('./css/user-settings/UserSettingsView.css'));
    });

    it('draws the settings rows thumb-sized and their fields at 16 px', () => {
        expect(settings).toMatch(/\.octane-handheld-settings \.air-settings-button \{[^}]*min-height: 48px/);
        expect(settings).toMatch(/:is\(\.air-settings-check-row, \.air-settings-select-row\) \{[^}]*min-height: 48px/);
        expect(settings).toMatch(/:is\(\.air-settings-checkbox, \.air-settings-radio\) \{[^}]*width: 24px !important/);
        expect(settings).toMatch(/\.air-settings-select-row \.octane-select-trigger \{[^}]*height: 40px/);
        expect(settings).toMatch(/\.air-settings-wordfilter__add input \{[^}]*font: 400 var\(--hh-size-field\)/);
        // The volume slider is a bar with a knob a thumb can hold, and the browser leaves the finger to it.
        expect(settings).toMatch(/\.air-settings-volume-row__thumb \{[^}]*width: 32px/);
        expect(settings).toMatch(/\.air-settings-volume-row__control-area \{[^}]*touch-action: none/);
    });

    it('gives the badge canvas to the finger and sizes it with the screen', () => {
        expect(badges).toMatch(/\.badge-creator-canvas \{[^}]*width: 100% !important;[^}]*aspect-ratio: 1;[^}]*touch-action: none/);
        expect(badges).toMatch(/\.badge-creator-canvas \{[^}]*background-size: 2\.5% 2\.5% !important/);
        expect(badges).toMatch(/\.badge-creator-palette \{[^}]*grid-template-columns: repeat\(8, minmax\(0, 1fr\)\) !important/);
        expect(badges).toMatch(/\.badge-creator-swatch \{[^}]*min-height: 36px/);
        expect(badges).toMatch(/input\.form-control \{[^}]*font: 400 var\(--hh-size-field\)/);
    });

    it('lists the talent levels and tasks as finger-sized rows', () => {
        expect(talent).toMatch(/\.octane-handheld-talent__level \{[^}]*min-height: 56px/);
        expect(talent).toMatch(/\.octane-handheld-talent__task \{[^}]*min-height: 64px/);
        expect(talent).toMatch(/:root\[data-handheld='landscape'\] \.octane-handheld-talent__list \{[^}]*flex: 0 0 42%/);
    });

    it('keeps the fixed frames whole instead of squeezing them to the screen', () => {
        expect(frames).toMatch(/\.draggable-window > \.octane-guide-tool \{[^}]*width: 282px !important;[^}]*max-height: none !important/);
        expect(frames).toMatch(/\.draggable-window > :is\(\.octane-collectibles-hub, \.octane-collectibles-reward-box\) \{[^}]*max-width: none !important/);
        expect(frames).toMatch(/\.draggable-window > \.octane-forum \{[^}]*max-width: none !important/);
        expect(frames).toMatch(/\.draggable-window > \.octane-talent-levelup \{[^}]*width: 430px !important/);
        expect(frames).toMatch(/\.octane-guide-tool \.chat-messages \{[^}]*height: 190px/);
    });

    it('keeps the fields of scaled windows at 16 px on screen', () => {
        expect(frames).toMatch(
            /@layer base \{\s*:root\[data-handheld\] \.octane-guide-tool \.octane-card-content-shell :where\(input, textarea\) \{\s*font-size: calc\(16px \/ var\(--octane-handheld-scale, 1\)\) !important/
        );
        expect(frames).toMatch(
            /\.octane-forum :is\(input, textarea\)\.octane-group-native__input \{[^}]*font-size: calc\(16px \/ var\(--octane-handheld-scale, 1\)\) !important/
        );
        expect(windows).toMatch(/@layer base \{\s*:root\[data-handheld\] \.user-account-settings__content input \{\s*font-size: 16px !important/);
    });

    it('sizes the shared Button by its height, which its own important utilities leave alone', () => {
        expect(progress).toMatch(/\.octane-quest-accept \{[^}]*height: 40px/);
        expect(progress).toMatch(/\.octane-daily-tasks-extra button \{[^}]*height: 40px/);
        expect(progress).toMatch(/\.octane-quests-hc-info \{[^}]*flex: none/);
        expect(windows).toMatch(/\.user-account-settings__content :is\(\.habbo-btn-primary, \.habbo-btn-secondary\) \{[^}]*height: 40px/);
    });
});

describe('phone windows of the Me menu', () => {
    const PAN = 'handheldScale={HANDHELD_PAN_ONLY_SCALE}';
    const ENLARGE = 'handheldMaxScale={HANDHELD_ENLARGE_FRAME_SCALE}';

    it.each([
        ['src/components/guide-tool/GuideToolView.tsx', [PAN, ENLARGE]],
        ['src/components/guide-tool/views/GuideToolReportView.tsx', [PAN, ENLARGE]],
        ['src/components/user-settings/UserAccountSettingsView.tsx', [PAN]],
        ['src/components/translation/TranslationSettingsView.tsx', [PAN]],
        ['src/components/discord/DiscordSettingsView.tsx', [PAN]],
        ['src/components/user-settings/UserSettingsView.tsx', ['<DraggableWindow handheldSheet uniqueKey="user-settings">', 'HandheldSheetFrame']],
        ['src/components/badge-creator/BadgeCreatorView.tsx', ['<DraggableWindow handheldSheet uniqueKey="badge-creator">', 'onTouchStart={handleTouchStart}']],
        ['src/components/talent/TalentTrackView.tsx', ['if (isHandheld) return <HandheldTalentTrackView']],
        ['src/layout/OctaneCard.tsx', ['className="octane-card-close-hit"']]
    ])('%s fits the phone', (path, parts) => {
        const source = read(path);

        for (const part of parts) expect(source).toContain(part);
    });
});
