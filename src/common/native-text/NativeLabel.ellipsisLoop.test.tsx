import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeLabel } from './NativeLabel';
import { forceNativeTextEnabled } from './nativeTextEnabled';

// Every raster drawn, in order.
const drawn: string[] = [];

vi.mock('./NativeText', () => ({
    NativeText: ({ text }: { text: string }) => {
        drawn.push(text);

        return <span data-testid="native">{text}</span>;
    }
}));

// Every letter 10 px wide; the font is there at once.
vi.mock('./NativeFont', () => ({
    peekNativeFont: () => ({ font: {} }),
    loadNativeFont: () => Promise.resolve(),
    measureNativeText: (_font: unknown, text: string) => text.length * 10
}));

const computed = {
    fontFamily: 'HabboAirUbuntu',
    fontSize: '17px',
    fontWeight: '700',
    fontStyle: 'normal',
    color: 'rgb(255, 255, 255)',
    letterSpacing: 'normal',
    textTransform: 'none',
    textDecorationLine: 'none',
    whiteSpace: 'nowrap',
    lineHeight: '22px',
    textAlign: 'start',
    textOverflow: 'ellipsis',
    overflowX: 'hidden',
    display: 'block',
    paddingLeft: '0px',
    paddingRight: '0px'
} as unknown as CSSStyleDeclaration;

describe('NativeLabel in a box that moves with its own text', () => {
    let observers: (() => void)[] = [];

    beforeEach(() => {
        forceNativeTextEnabled(true);
        observers = [];
        drawn.length = 0;
        vi.spyOn(window, 'getComputedStyle').mockReturnValue(computed);
        vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ top: 0 }] as unknown as DOMRectList);
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: () => void) {
                    observers.push(callback);
                }
                observe() {}
                disconnect() {}
            }
        );
    });

    afterEach(() => {
        cleanup();
        forceNativeTextEnabled(null);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('stays shortened instead of being laid out again every frame', () => {
        // A title beside the purse: shortened, it leaves the purse room and its box grows; in full it overflows and shrinks.
        const title = 'The Builders Club Warehouse';
        // The box reads the label's text as it is now, as a browser lays it out.
        const isShortened = () => (document.querySelector('[data-testid="native"]')?.textContent ?? title) !== title;

        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
            return this.classList.contains('title') ? (isShortened() ? 150 : 100) : 400;
        });
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
            return this.classList.contains('title') ? (isShortened() ? 150 : title.length * 10) : 400;
        });

        render(
            <div>
                <div className="title">
                    <NativeLabel text={title} />
                </div>
            </div>
        );

        for (let frame = 0; frame < 20; frame++) act(() => observers.slice().forEach((observer) => observer()));

        const fullDraws = drawn.filter((text) => text === title).length;
        expect(screen.getByTestId('native').textContent).not.toBe(title);
        expect(screen.getByTestId('native').textContent?.endsWith('...')).toBe(true);
        // Drawn in full once, then at most the few times the guard allows: not on every frame.
        expect(fullDraws).toBeLessThanOrEqual(5);
    });
});
