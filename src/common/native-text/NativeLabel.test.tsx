import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseButton } from '../BaseButton';
import { Text } from '../Text';
import { NativeLabel } from './NativeLabel';
import { nativeTextChildren } from './nativeTextChildren';
import { forceNativeTextEnabled } from './nativeTextEnabled';

vi.mock('./NativeText', () => ({
    NativeText: ({
        text,
        overrides,
        maxWidth
    }: {
        text: string;
        overrides: { family: string; size: number; bold: boolean; color: number };
        maxWidth?: number;
    }) => (
        <span
            data-font={`${overrides.family} ${overrides.size} ${overrides.bold ? 'bold' : 'regular'} ${overrides.color.toString(16)}`}
            data-max-width={String(maxWidth)}
            data-testid="native"
        >
            {text}
        </span>
    )
}));

const computed = (overrides: Record<string, string> = {}) =>
    ({
        fontFamily: 'HabboAirUbuntu',
        fontSize: '12px',
        fontWeight: '700',
        fontStyle: 'normal',
        color: 'rgb(255, 255, 255)',
        letterSpacing: 'normal',
        textTransform: 'none',
        textDecorationLine: 'none',
        whiteSpace: 'normal',
        lineHeight: '15px',
        textAlign: 'start',
        ...overrides
    }) as unknown as CSSStyleDeclaration;

describe('NativeLabel', () => {
    beforeEach(() => forceNativeTextEnabled(true));
    afterEach(() => {
        cleanup();
        forceNativeTextEnabled(null);
        vi.restoreAllMocks();
    });

    it('draws the text in the font its CSS resolves to', () => {
        vi.spyOn(window, 'getComputedStyle').mockReturnValue(computed());
        render(<NativeLabel text="Navigator" />);

        expect(screen.getByTestId('native')).toHaveAttribute('data-font', 'Ubuntu 12 bold ffffff');
        expect(screen.getByTestId('native')).toHaveAttribute('data-max-width', 'undefined');
    });

    it('waits for a box without a width instead of freezing the text one letter wide', () => {
        // The body of a closed <details>: the browser breaks the text after every letter in a box 0 px wide.
        let width = 0;
        let resized: () => void = () => undefined;

        vi.spyOn(window, 'getComputedStyle').mockReturnValue(computed({ display: 'block' }));
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
        vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(
            () => (width ? [{ top: 0 }, { top: 15 }] : Array.from({ length: 9 }, (_, index) => ({ top: index * 15 }))) as unknown as DOMRectList
        );
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: () => void) {
                    resized = callback;
                }
                observe() {}
                disconnect() {}
            }
        );

        render(
            <div>
                <NativeLabel text="Higher values place this fx lower" />
            </div>
        );
        expect(screen.queryByTestId('native')).toBeNull();

        // Opened: the box has its width, the label is measured and wraps in it (the raster's 2 px gutters included).
        width = 300;
        act(() => resized());
        expect(screen.getByTestId('native')).toHaveAttribute('data-max-width', '304');

vi.unstubAllGlobals();
    });

    it('waits for a hidden panel instead of taking its text for one line', () => {
        // A collapsed panel is display: none: its text has no boxes at all.
        let shown = false;
        let resized: () => void = () => undefined;

        vi.spyOn(window, 'getComputedStyle').mockReturnValue(computed({ display: 'block' }));
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => (shown ? 300 : 0));
        vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
            if (this === document.documentElement) return [{ top: 0 }] as unknown as DOMRectList;

            return (shown ? [{ top: 0 }, { top: 15 }] : []) as unknown as DOMRectList;
        });
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: () => void) {
                    resized = callback;
                }
                observe() {}
                disconnect() {}
            }
        );

        render(
            <div>
                <NativeLabel text="Hogere waarden plaatsen dit effect lager in de effectenstapel van het object." />
            </div>
        );
        expect(screen.queryByTestId('native')).toBeNull();

        shown = true;
        act(() => resized());
        expect(screen.getByTestId('native')).toHaveAttribute('data-max-width', '304');

                vi.unstubAllGlobals();
    });

    it('stays browser text for a font the native renderer lacks', () => {
        vi.spyOn(window, 'getComputedStyle').mockReturnValue(computed({ fontFamily: 'Arial' }));
        render(<NativeLabel text="Arial text" />);

        expect(screen.queryByTestId('native')).toBeNull();
        expect(screen.getByText('Arial text')).toBeInTheDocument();
    });

    it('measures again when its state changes', () => {
        const spy = vi.spyOn(window, 'getComputedStyle').mockReturnValue(computed());
        const { rerender } = render(<NativeLabel stateKey="idle" text="Tab" />);

        spy.mockReturnValue(computed({ color: 'rgb(0, 0, 0)' }));
        rerender(<NativeLabel stateKey="active" text="Tab" />);

        expect(screen.getByTestId('native')).toHaveAttribute('data-font', 'Ubuntu 12 bold 0');
    });
});

describe('nativeTextChildren', () => {
    afterEach(() => {
        cleanup();
        forceNativeTextEnabled(null);
        vi.restoreAllMocks();
    });

    it('returns the children untouched while native text is off', () => {
        forceNativeTextEnabled(false);

        expect(nativeTextChildren('Hello')).toBe('Hello');
    });

    it('turns text-only children into one label and leaves markup alone', () => {
        forceNativeTextEnabled(true);
        vi.spyOn(window, 'getComputedStyle').mockReturnValue(computed());

        render(
            <>
                <Text>{['Credits: ', 25, false]}</Text>
                <BaseButton>OK</BaseButton>
                <Text>
                    <b>bold</b> text
                </Text>
            </>
        );

        expect(screen.getAllByTestId('native').map((node) => node.textContent)).toEqual(['Credits: 25', 'OK']);
        expect(screen.getByText('bold')).toBeInTheDocument();
    });
});
