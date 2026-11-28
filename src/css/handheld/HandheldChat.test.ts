import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const css = read('src/css/handheld/HandheldChat.css');

const selectors = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap((match) =>
    match[1]
        .split(/,(?![^(]*\))/)
        .map((selector) => selector.trim())
        .filter(Boolean)
);

const rule = (selector: string): string => {
    const start = css.indexOf(`\n${selector} {`);

    expect(start, selector).toBeGreaterThanOrEqual(0);

    return css.slice(start, css.indexOf('}', start));
};

describe('phone chat composer stylesheet', () => {
    it('only styles the phone layout', () => {
        expect(selectors.length).toBeGreaterThan(30);
        expect(selectors.filter((selector) => !selector.startsWith(':root[data-handheld'))).toEqual([]);
    });

    it('is loaded after the desktop chat input and the phone HUD', () => {
        const imports = [...read('src/index.tsx').matchAll(/import '([^']+\.css)'/g)].map((match) => match[1]);
        const sheet = imports.indexOf('./css/handheld/HandheldChat.css');

        for (const earlier of ['./css/room/RoomWidgets.css', './css/chat/ChatInputHabbiconSelectorView.css', './css/chat/ChatInputMentionSelectorView.css', './css/handheld/HandheldHud.css']) {
            expect(imports.indexOf(earlier), earlier).toBeGreaterThanOrEqual(0);
            expect(sheet).toBeGreaterThan(imports.indexOf(earlier));
        }
    });

    it('hides no scrollbar', () => {
        expect(css).not.toMatch(/scrollbar-width|::-webkit-scrollbar/);
    });

    it('is a see-through sheet that keeps clear of the safe areas, and needs none of the bottom one over the keyboard', () => {
        const band = rule(':root[data-handheld] .octane-handheld-composer');

        expect(band).toContain('background: var(--hh-air-hud)');
        expect(read('src/css/handheld/HandheldTokens.css')).toMatch(/--hh-air-hud: rgba\(\d+, \d+, \d+, 0\.\d+\)/);
        expect(band).toContain('var(--octane-safe-bottom)');
        expect(band).toContain('var(--octane-safe-left)');
        expect(band).toContain('var(--octane-safe-right)');
        expect(rule(':root[data-handheld][data-handheld-keyboard] .octane-handheld-composer')).toContain('padding-bottom: 8px');
    });

    it('centres both rows in one column in landscape', () => {
        const column = rule(':root[data-handheld] .octane-handheld-composer__column');

        expect(column).toContain('max-width: 510px');
        expect(column).toContain('margin: 0 auto');
    });

    it('shows the chosen segment as a white pill with dark text inside the dark track', () => {
        const chosen = rule(":root[data-handheld] .octane-handheld-composer__mode[aria-pressed='true']");

        expect(rule(':root[data-handheld] .octane-handheld-composer__modes')).toContain('border-radius: var(--hh-radius-pill)');
        expect(chosen).toContain('background: var(--hh-air-white)');
        expect(chosen).toContain('color: var(--hh-air-text)');
    });

    it('sends from the green button and closes from the red one', () => {
        expect(rule(':root[data-handheld] .octane-handheld-composer__send')).toContain('background: var(--hh-primary)');
        expect(rule(':root[data-handheld] .octane-handheld-composer__close')).toContain('background: var(--hh-dismiss)');
    });

    it('types at 16 px, so mobile Safari does not zoom into the field', () => {
        expect(rule(':root[data-handheld] .octane-handheld-composer__input')).toContain('font-size: var(--hh-size-field)');
        expect(read('src/css/handheld/HandheldTokens.css')).toContain('--hh-size-field: 16px;');
    });
});
