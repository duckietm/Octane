import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CssNativeText, parseCssTextColor } from './CssNativeText';

vi.mock('./NativeText', () => ({
    NativeText: ({ text, background, overrides }: { text: string; background: number | null; overrides: { color: number } }) => (
        <span data-background={String(background)} data-color={overrides.color.toString(16)} data-testid="native">
            {text}
        </span>
    )
}));

describe('parseCssTextColor', () => {
    it('reads rgb and rgba, and gives up on transparent or unknown values', () => {
        expect(parseCssTextColor('rgb(102, 102, 102)')).toBe(0x666666);
        expect(parseCssTextColor('rgba(82, 129, 154, 1)')).toBe(0x52819a);
        expect(parseCssTextColor('rgb(255 255 255 / 50%)')).toBe(0xffffff);
        expect(parseCssTextColor('rgba(0, 0, 0, 0)')).toBeNull();
        expect(parseCssTextColor('')).toBeNull();
        expect(parseCssTextColor('canvastext')).toBeNull();
    });
});

describe('CssNativeText', () => {
    afterEach(cleanup);

    it('draws in the colour the CSS gives its host, on a transparent surface by default', () => {
        render(
            <span style={{ color: '#52819a' }}>
                <CssNativeText text="Kapsels" textStyle="u_bold" />
            </span>
        );

        const native = screen.getByTestId('native');

        expect(native).toHaveTextContent('Kapsels');
        expect(native).toHaveAttribute('data-color', '52819a');
        expect(native).toHaveAttribute('data-background', 'null');
    });

    it('re-reads the colour when the colour key changes', () => {
        const row = (active: boolean) => (
            <span style={{ color: active ? '#ffffff' : '#666666' }}>
                <CssNativeText colorKey={active} text="Meubels" textStyle="u_bold" />
            </span>
        );
        const { rerender } = render(row(false));

        expect(screen.getByTestId('native')).toHaveAttribute('data-color', '666666');

        rerender(row(true));

        expect(screen.getByTestId('native')).toHaveAttribute('data-color', 'ffffff');
    });
});
