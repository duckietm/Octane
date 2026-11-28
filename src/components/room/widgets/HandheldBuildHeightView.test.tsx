/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../state/handheldStore';

const state = vi.hoisted(() => ({
    height: 0,
    underpass: false,
    minHeight: 0,
    maxHeight: 40,
    applyHeight: vi.fn(),
    toggleUnderpass: vi.fn(),
    close: vi.fn()
}));

vi.mock('../../../hooks', () => ({
    useBuildHeight: () => ({
        available: true,
        isOpen: true,
        minHeight: state.minHeight,
        maxHeight: state.maxHeight,
        height: state.height,
        underpass: state.underpass,
        applyHeight: state.applyHeight,
        toggleUnderpass: state.toggleUnderpass,
        close: state.close
    })
}));

import { BuildHeightWidgetView } from './BuildHeightWidgetView';

// No texts are loaded: buttons carry their fallbacks, LocalizeText gives nothing.
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));

describe('the build height on a phone', () => {
    beforeEach(() => {
        state.height = 0;
        state.underpass = false;
        state.minHeight = 0;
        state.maxHeight = 40;
        state.applyHeight.mockClear();
        state.toggleUnderpass.mockClear();
        state.close.mockClear();
    });

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('is a low drawer panel in the look of the build tools, not the desktop card', () => {
        phone();
        render(<BuildHeightWidgetView />);

        const drawer = document.querySelector('.octane-handheld-drawer');

        expect(drawer).not.toBeNull();
        expect(drawer.querySelector('.octane-handheld-build.octane-handheld-build-height')).not.toBeNull();
        expect(document.querySelector('.octane-build-height-widget')).toBeNull();
        // No peek and no fold: it is always open.
        expect(drawer.getAttribute('data-state')).toBe('open');
        expect(drawer.querySelector('.octane-handheld-drawer__grip')).toBeNull();
    });

    it('steps the height by a tile and by a tenth, through the desktop clamp, never past the range', () => {
        state.height = 39.5;
        phone();
        render(<BuildHeightWidgetView />);

        act(() => fireEvent.click(button('Raise 1')));
        expect(state.applyHeight).toHaveBeenLastCalledWith(40);

        act(() => fireEvent.click(button('Raise 0.1')));
        expect(state.applyHeight).toHaveBeenLastCalledWith(39.6);

        act(() => fireEvent.click(button('Lower 0.1')));
        expect(state.applyHeight).toHaveBeenLastCalledWith(39.4);

        act(() => fireEvent.click(button('Lower 1')));
        expect(state.applyHeight).toHaveBeenLastCalledWith(38.5);
    });

    it('greys the steps out at either end of the range', () => {
        phone();
        const { rerender } = render(<BuildHeightWidgetView />);

        expect(button('Lower 1')).toHaveProperty('disabled', true);
        expect(button('Raise 1')).toHaveProperty('disabled', false);

        state.height = 40;
        rerender(<BuildHeightWidgetView />);

        expect(button('Raise 0.1')).toHaveProperty('disabled', true);
    });

    it('takes a typed height', () => {
        phone();
        render(<BuildHeightWidgetView />);

        const field = screen.getByRole('spinbutton');

        act(() => fireEvent.change(field, { target: { value: '12.34' } }));

        expect(state.applyHeight).toHaveBeenLastCalledWith(12.3);
    });

    it('locks walking underneath below 1.5 with the reason, and toggles it above', () => {
        state.height = 1;
        phone();
        const { rerender } = render(<BuildHeightWidgetView />);

        expect(screen.getByRole('checkbox').getAttribute('aria-disabled')).toBe('true');
        expect(document.querySelector('.octane-handheld-build-height__hint')).not.toBeNull();

        state.height = 2;
        rerender(<BuildHeightWidgetView />);

        expect(document.querySelector('.octane-handheld-build-height__hint')).toBeNull();

        act(() => fireEvent.click(screen.getByRole('checkbox')));

        expect(state.toggleUnderpass).toHaveBeenCalledWith(true);
    });

    it('puts furni back on the floor, and turns the tool off from its button and from the close button', () => {
        state.height = 3.5;
        phone('landscape');
        render(<BuildHeightWidgetView />);

        act(() => fireEvent.click(button('Floor level')));
        expect(state.applyHeight).toHaveBeenCalledWith(0);

        act(() => fireEvent.click(document.querySelector('.octane-handheld-build-height__action.is-off')));
        act(() => fireEvent.click(button('Close')));
        expect(state.close).toHaveBeenCalledTimes(2);
    });

    it('keeps the desktop card on the desktop', () => {
        render(<BuildHeightWidgetView />);

        expect(document.querySelector('.octane-build-height-widget')).not.toBeNull();
        expect(document.querySelector('.octane-handheld-drawer')).toBeNull();
    });
});
