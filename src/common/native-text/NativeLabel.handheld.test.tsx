import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';
import { NativeLabel } from './NativeLabel';
import { forceNativeTextEnabled } from './nativeTextEnabled';

vi.mock('./NativeText', () => ({
    NativeText: ({ text, overrides }: { text: string; overrides: { family: string; size: number } }) => (
        <span data-font={`${overrides.family} ${overrides.size}`} data-testid="native">
            {text}
        </span>
    )
}));

const computed = (fontFamily: string, fontSize: string) =>
    ({
        fontFamily,
        fontSize,
        fontWeight: '400',
        fontStyle: 'normal',
        color: 'rgb(0, 0, 0)',
        letterSpacing: 'normal',
        textTransform: 'none',
        textDecorationLine: 'none',
        whiteSpace: 'normal',
        lineHeight: '12px',
        textAlign: 'start',
        display: 'block',
        textOverflow: 'clip',
        overflowX: 'visible',
        paddingLeft: '0px',
        paddingRight: '0px'
    }) as unknown as CSSStyleDeclaration;

// The phone rule (Handheld.css) applies the size the label asks for through its custom property.
const mockVolter = (family = 'Volter') =>
    vi
        .spyOn(window, 'getComputedStyle')
        .mockImplementation((element: Element) =>
            (element as HTMLElement).hasAttribute?.('data-handheld-size')
                ? computed(family, (element as HTMLElement).style.getPropertyValue('--octane-handheld-label-size'))
                : computed(family, '9px')
        );

describe('NativeLabel on a phone', () => {
    beforeEach(() => forceNativeTextEnabled(true));
    afterEach(() => {
        cleanup();
        forceNativeTextEnabled(null);
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        vi.restoreAllMocks();
    });

    it('keeps Volter 9 px on desktop', () => {
        mockVolter();
        render(<NativeLabel text="Online" />);

        expect(screen.getByTestId('native')).toHaveAttribute('data-font', 'Volter 9');
        expect(document.querySelector('octane-label')?.hasAttribute('data-handheld-size')).toBe(false);
    });

    it('draws small Volter text larger in a window that reflows', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        mockVolter();
        render(<NativeLabel text="Online" />);

        expect(screen.getByTestId('native')).toHaveAttribute('data-font', 'Volter 11');
        expect(document.querySelector('octane-label')).toHaveAttribute('data-handheld-size');
    });

    it('leaves labels of a frame drawn at fixed coordinates, and other faces, at their size', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        mockVolter();
        render(
            <div data-handheld-fixed="">
                <NativeLabel text="Wired" />
            </div>
        );

        expect(screen.getByTestId('native')).toHaveAttribute('data-font', 'Volter 9');
        cleanup();

        mockVolter('HabboAirUbuntu');
        render(<NativeLabel text="Ubuntu" />);
        expect(screen.getByTestId('native')).toHaveAttribute('data-font', 'Ubuntu 9');
    });
});
