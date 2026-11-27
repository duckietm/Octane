import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const SHEETS = ['HandheldWindows.css', 'HandheldFloorplan.css'];

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

const selectorsOf = (css: string): string[] =>
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap((match) => splitSelectorList(match[1]));

describe('phone layout, stage 4 stylesheets', () => {
    it.each(SHEETS)('%s only styles the phone layout', (sheet) => {
        const selectors = selectorsOf(read(`src/css/handheld/${sheet}`));

        expect(selectors.length).toBeGreaterThan(5);
        expect(selectors.filter((selector) => !selector.startsWith(':root[data-handheld'))).toEqual([]);
    });

    it('loads them after the windows they adapt', () => {
        const imports = [...read('src/index.tsx').matchAll(/import '([^']+\.css)'/g)].map((match) => match[1]);

        for (const sheet of SHEETS) {
            expect(imports.indexOf(`./css/handheld/${sheet}`)).toBeGreaterThan(imports.indexOf('./css/handheld/Handheld.css'));
            expect(imports.indexOf(`./css/handheld/${sheet}`)).toBeGreaterThan(imports.indexOf('./css/floorplan-editor/FloorplanEditorView.css'));
            expect(imports.indexOf(`./css/handheld/${sheet}`)).toBeGreaterThan(imports.indexOf('./css/purse/PurseView.css'));
        }
    });

    it('keeps the peek button out of the scaled and sheet sizing, and hides a window put aside', () => {
        const css = read('src/css/handheld/HandheldWindows.css');

        expect(css).toMatch(/\.draggable-window\[data-handheld-peeked\] \{[^}]*visibility: hidden !important/);
        expect(css).toMatch(/> \.octane-handheld-peek-button \{[^}]*zoom: 1;[^}]*\}/);
        expect(css).toMatch(/> \.octane-handheld-peek-button \{[^}]*width: 32px !important/);
    });

    it('gives the purse actions thumb-sized buttons in a row', () => {
        const css = read('src/css/handheld/HandheldWindows.css');

        expect(css).toMatch(/\.octane-purse__col--actions \{[^}]*flex-direction: row/);
        expect(css).toMatch(/\.octane-purse__btn--settings \{[^}]*height: 48px/);
    });

    it('lets the fingers draw on the floor plan instead of scrolling the page', () => {
        expect(read('src/css/handheld/HandheldFloorplan.css')).toMatch(/\.fp-stage-svg \{[^}]*touch-action: none/);
    });

    it('enlarges small Volter labels through the phone-only rule', () => {
        expect(read('src/css/handheld/Handheld.css')).toMatch(
            /:root\[data-handheld\] octane-label\[data-handheld-size\] \{[^}]*font-size: var\(--octane-handheld-label-size\) !important/
        );
    });
});

describe('phone layout, stage 4 windows', () => {
    const TOUCH = 'handheldScale={HANDHELD_TOUCH_FRAME_SCALE}';
    const ENLARGE = 'handheldMaxScale={HANDHELD_ENLARGE_FRAME_SCALE}';
    const WIDE = 'handheldScale={HANDHELD_MIN_FRAME_SCALE}';

    it.each([
        ['src/components/wired/views/WiredBaseView.tsx', [TOUCH, ENLARGE, 'handheldPeek={handheldPeek}']],
        ['src/components/wired-tools/WiredCreatorToolsView.tsx', [WIDE, 'handheldPeek=']],
        ['src/components/wired-tools/WiredRoomLogsView.tsx', [WIDE]],
        ['src/components/wired-tools/WiredVariableOwnersPanel.tsx', [WIDE]],
        ['src/components/wired-tools/WiredChestTransactionLogView.tsx', [WIDE]],
        ['src/components/wired-tools/WiredArrayInspectorView.tsx', [WIDE]],
        ['src/components/wired-tools/WiredSelfDonationView.tsx', [WIDE]],
        ['src/components/variables-explorer/VariablesExplorerMainView.tsx', [WIDE]],
        ['src/components/floorplan-editor/FloorplanEditorView.tsx', ['handheldSheet', 'handheldPeek=']],
        ['src/components/groups/views/GroupManagementWindow.tsx', [TOUCH, ENLARGE]],
        ['src/components/groups/views/forums/GroupForumLayout.tsx', [TOUCH]],
        ['src/components/mod-tools/native/NativeWindowShell.tsx', [TOUCH]],
        ['src/components/camera/views/CameraWidgetCaptureView.tsx', ['handheldScale={HANDHELD_PAN_ONLY_SCALE}']],
        ['src/components/camera/views/editor/CameraWidgetEditorView.tsx', [TOUCH]],
        ['src/components/navigator/views/room-settings/NavigatorRoomSettingsView.tsx', ['handheldSheet']],
        ['src/components/room/widgets/furniture/FurnitureAreaHideView.tsx', [TOUCH, ENLARGE, 'forced: selecting']],
        ['src/components/room/widgets/furniture/FurnitureDimmerView.tsx', [TOUCH, ENLARGE, 'handheldPeek=']],
        ['src/components/room/widgets/furniture/FurnitureBackgroundColorView.tsx', [TOUCH, ENLARGE, 'handheldPeek=']],
        ['src/components/room/widgets/furniture/FurnitureStickieView.tsx', [TOUCH, ENLARGE]],
        ['src/components/room/widgets/furniture/FurnitureExchangeCreditView.tsx', [TOUCH, ENLARGE]],
        ['src/components/room/widgets/furniture/FurnitureYoutubeDisplayView.tsx', [TOUCH]],
        ['src/common/layout/LayoutTrophyView.tsx', [TOUCH, ENLARGE]]
    ])('%s fits the phone', (path, props) => {
        const source = read(path);

        for (const prop of props) expect(source).toContain(prop);
    });
});
