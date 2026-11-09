import { cleanup, render, screen } from '@testing-library/react';
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
