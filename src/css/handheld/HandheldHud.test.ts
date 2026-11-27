import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HANDHELD_TOOLBAR_RESERVE } from '../../api/handheld/handheldWindowFit';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const hud = read('src/css/handheld/HandheldHud.css');
const base = read('src/css/handheld/Handheld.css');
const roomHud = read('src/css/handheld/HandheldRoomHud.css');
const tokens = read('src/css/handheld/HandheldTokens.css');

/** Every selector of the flat stylesheet, split on the commas of its selector lists. */
const selectorsOf = (css: string): string[] =>
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap((match) =>
        match[1]
            .split(/,(?![^(]*\))/)
            .map((selector) => selector.trim())
            .filter(Boolean)
    );

/** The declarations of the rule with exactly this selector list. */
const rule = (css: string, selector: string): string => {
    const start = css.indexOf(`\n${selector} {`);

    expect(start, selector).toBeGreaterThanOrEqual(0);

    return css.slice(start, css.indexOf('}', start));
};

const px = (declarations: string, property: string): number => Number(new RegExp(`\\b${property}: (\\d+)px`).exec(declarations)?.[1]);

describe('phone HUD stylesheet', () => {
    it('only styles the phone layout', () => {
        const selectors = selectorsOf(hud);

        expect(selectors.length).toBeGreaterThan(40);
        expect(selectors.filter((selector) => !selector.startsWith(':root[data-handheld'))).toEqual([]);
    });

    it('is loaded after the toolbar, purse and room widgets it restyles', () => {
        const imports = [...read('src/index.tsx').matchAll(/import '([^']+\.css)'/g)].map((match) => match[1]);
        const sheet = imports.indexOf('./css/handheld/HandheldHud.css');

        for (const earlier of ['./css/handheld/Handheld.css', './css/handheld/HandheldRoomHud.css', './css/toolbar/ToolBar.css', './css/purse/PurseView.css', './css/room/RoomWidgets.css']) {
            expect(imports.indexOf(earlier), earlier).toBeGreaterThanOrEqual(0);
            expect(sheet).toBeGreaterThan(imports.indexOf(earlier));
        }
    });

    it('hides no scrollbar', () => {
        expect(hud).not.toMatch(/scrollbar-width|::-webkit-scrollbar/);
    });
});

describe('phone dock', () => {
    it('is centred at the bottom in portrait and sits in the bottom left corner in landscape', () => {
        const dock = rule(hud, ':root[data-handheld] .octane-handheld-dock');
        const landscape = rule(hud, ":root[data-handheld='landscape'] .octane-handheld-dock");

        expect(dock).toContain('left: 50%');
        expect(dock).toContain('transform: translateX(-50%)');
        expect(dock).toContain('bottom: calc(8px + var(--octane-safe-bottom))');
        expect(landscape).toContain('left: calc(8px + var(--octane-safe-left))');
        expect(landscape).toContain('transform: none');
    });

    it('is a see-through glass pill with thumb-sized cells and one round button beside it', () => {
        const panel = rule(hud, ':root[data-handheld] .octane-handheld-dock__panel');
        const pill = rule(hud, ':root[data-handheld] .octane-handheld-dock__pill');
        const button = rule(hud, ':root[data-handheld] .octane-handheld-dock__button');
        const lead = rule(hud, ':root[data-handheld] .octane-handheld-dock__button.is-lead');

        expect(pill).toContain('background: var(--hh-air-hud)');
        expect(tokens).toMatch(/--hh-air-hud: rgba\(\d+, \d+, \d+, 0\.\d+\)/);
        expect(pill).toContain('backdrop-filter: var(--hh-blur)');
        expect(pill).toContain('border-radius: var(--hh-radius-pill)');
        expect(px(panel, 'height')).toBe(52);
        expect(px(pill, 'height')).toBe(52);
        expect(button).toContain('width: min(48px,');
        expect(px(button, 'height')).toBeGreaterThanOrEqual(44);
        expect(px(lead, 'width')).toBe(52);
        expect(px(lead, 'height')).toBe(52);
        // The room chat is the primary action of a room: the green button.
        expect(rule(hud, ":root[data-handheld] .octane-handheld-dock__button.is-lead[data-dock='chat']")).toContain('background: var(--hh-primary)');
    });

    it('is the strip that windows and sheets keep clear, in the stylesheet and in the window placement', () => {
        const panelHeight = px(rule(hud, ':root[data-handheld] .octane-handheld-dock__panel'), 'height');
        const margin = Number(/bottom: calc\((\d+)px/.exec(rule(hud, ':root[data-handheld] .octane-handheld-dock'))[1]);

        expect(base).toContain(`--octane-handheld-toolbar: ${panelHeight + margin}px;`);
        expect(HANDHELD_TOOLBAR_RESERVE).toBe(panelHeight + margin);
    });

    it('steps aside while the on-screen keyboard is open', () => {
        expect(base).toMatch(/\[data-handheld-keyboard\] \.octane-handheld-dock,[^{]*\{[^}]*visibility: hidden/);
    });

    it('opens the Me popup above the dock, scrolling inside when it is taller than the screen', () => {
        const popup = rule(hud, ':root[data-handheld] .octane-handheld-dock__me');

        expect(popup).toContain('bottom: calc(100% + 8px)');
        expect(popup).toContain('overflow-y: auto');
        expect(popup).toMatch(/max-height: calc\(100vh - /);
        expect(rule(hud, ':root[data-handheld] .octane-handheld-dock__me .octane-toolbar-me')).toContain('display: grid');
    });
});

describe('phone chat composer frame', () => {
    it('is a band across the bottom edge', () => {
        const frame = rule(base, ':root[data-handheld] .tb-frame');

        expect(frame).toContain('bottom: 0 !important');
        expect(frame).toContain('left: 0 !important');
        expect(frame).toContain('width: 100% !important');
        expect(frame).toContain('height: auto !important');
        // The desktop frame is centred with the translate property; "none" is dropped by the CSS minifier.
        expect(frame).toContain('translate: 0 !important');
    });

    it('is away until it is asked for, without being unmounted', () => {
        expect(base).toMatch(/\.tb-frame:not\(\[data-handheld-chat\]\) \{[^}]*opacity: 0/);
        expect(base).toMatch(/\.tb-frame:not\(\[data-handheld-chat\]\) \* \{[^}]*pointer-events: none !important/);
        expect(base).not.toMatch(/\.tb-frame[^{]*\{[^}]*display: none/);
    });

    it('still rides on top of the on-screen keyboard', () => {
        expect(base).toMatch(/\[data-handheld-keyboard\] \.tb-frame \{[^}]*bottom: var\(--octane-keyboard-inset, 0px\) !important/);
    });

    it('is driven by the toolbar from the shared flag', () => {
        const toolbar = read('src/components/toolbar/ToolbarView.tsx');

        expect(toolbar).toContain('const handheldChatOpen = useHandheldChatLine(isInRoom);');
        expect(toolbar).toContain("data-handheld-chat={ handheldChatOpen ? 'open' : undefined }");
        expect(toolbar).toContain('composerOpen={ handheldChatOpen }');
    });

    it('has no chat button left under the room chip', () => {
        expect(hud).not.toContain('octane-handheld-chat-button');
        expect(roomHud).not.toContain('octane-handheld-chat-button');
        expect(read('src/components/room/widgets/room-tools/RoomToolsWidgetView.tsx')).not.toContain('HandheldChatButtonView');
    });
});

describe('phone room chip and purse chip', () => {
    it('hangs the room tools from the chip at the top left', () => {
        const container = rule(roomHud, ':root[data-handheld] .octane-room-tools-container,\n:root[data-handheld] .octane-room-tools-container.is-collapsed');

        expect(container).toContain('top: calc(8px + var(--octane-safe-top))');
        expect(container).toContain('left: calc(8px + var(--octane-safe-left))');
        expect(container).toContain('bottom: auto');
        expect(rule(roomHud, ':root[data-handheld] .octane-room-tools-container .octane-room-tools')).toContain('top: 50px');
    });

    it('keeps the purse chip inside the safe area at the top right', () => {
        const side = rule(hud, ':root[data-handheld] .octane-right-side');

        expect(side).toContain('top: var(--octane-safe-top)');
        expect(side).toContain('right: var(--octane-safe-right)');
        // The capsules stand 8 px from the top and 4 px (+ their own 4 px margin) from the right, inside the box's padding.
        expect(side).toContain('padding: 8px 4px 24px 24px');
        expect(side).toContain('var(--octane-handheld-toolbar)');
    });

    it('never shows a folded block through its own display rule', () => {
        expect(hud).toContain('.octane-handheld-purse__more:not([hidden])');
        expect(hud).toContain('.octane-handheld-side-widgets:not([hidden])');
    });
});

describe('desktop stays as it is', () => {
    it('only mounts the phone dock in the phone layout and keeps the touch bar for tablets', () => {
        const toolbar = read('src/components/toolbar/ToolbarView.tsx');

        expect(toolbar).toMatch(/\{ isHandheld &&\s*<HandheldToolbarView/);
        expect(toolbar).toContain("const mobileOnlyClasses = (touchLayout && !isHandheld) ? '' : 'hidden';");
        expect(toolbar).toContain("const desktopBlockClasses = touchLayout ? 'hidden' : 'block';");
        expect(toolbar).toContain('if(isHandheld)');
    });

    it('keeps the right column and the purse as they were outside the phone layout', () => {
        const side = read('src/components/right-side/RightSideView.tsx');
        const purse = read('src/components/purse/PurseView.tsx');

        expect(side).toMatch(/\{isHandheld \? \(\s*<div className="octane-handheld-side-widgets" hidden=\{!sideOpen\}>\s*\{widgets\}\s*<\/div>\s*\) : \(\s*widgets\s*\)\}/);
        expect(purse).toContain('if (isHandheld) {');
        expect(purse).toContain('<Column alignItems="end" className="octane-purse-container" gap={0}>');
    });

    it('keeps the room tools handle and the Me menu selection on desktop', () => {
        const tools = read('src/components/room/widgets/room-tools/RoomToolsWidgetView.tsx');
        const me = read('src/components/toolbar/ToolbarMeView.tsx');

        expect(tools).toContain("className={isHandheld ? 'octane-handheld-room-chip' : 'room-tools-collapse-toggle'}");
        expect(me).toContain('selectOwnAvatar = true');
    });
});
