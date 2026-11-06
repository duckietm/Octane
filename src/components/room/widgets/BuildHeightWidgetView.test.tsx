/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    height: 0,
    underpass: false,
    applyHeight: vi.fn(),
    toggleUnderpass: vi.fn(),
    close: vi.fn()
}));

vi.mock('../../../hooks', () => ({
    useBuildHeight: () => ({
        available: true,
        isOpen: true,
        minHeight: 0,
        maxHeight: 40,
        height: state.height,
        underpass: state.underpass,
        applyHeight: state.applyHeight,
        toggleUnderpass: state.toggleUnderpass,
        close: state.close
    })
}));

import { BuildHeightWidgetView } from './BuildHeightWidgetView';

// The window is drawn in a portal: query the whole document. No texts are loaded, so buttons carry their fallbacks.
const button = (name: string) => screen.getByRole('button', { name });

describe('BuildHeightWidgetView', () => {
    beforeEach(() => {
        state.applyHeight.mockClear();
        state.close.mockClear();
    });

    afterEach(() => cleanup());

    it('steps the height by a tenth, never past the range', () => {
        state.height = 0;
        render(<BuildHeightWidgetView />);

        expect(button('Lower')).toHaveProperty('disabled', true);

        act(() => fireEvent.click(button('Raise')));

        expect(state.applyHeight).toHaveBeenCalledWith(0.1);
    });

    it('explains why walking underneath is locked below 1.5, and drops the note above it', () => {
        state.height = 1;
        const { rerender } = render(<BuildHeightWidgetView />);

        expect(document.body.querySelector('.build-height-hint')).not.toBeNull();

        state.height = 2;
        rerender(<BuildHeightWidgetView />);

        expect(document.body.querySelector('.build-height-hint')).toBeNull();
    });

    it('puts furni back on the floor, and turns the tool off with its own button', () => {
        state.height = 3.5;
        render(<BuildHeightWidgetView />);

        act(() => fireEvent.click(button('Floor level')));
        expect(state.applyHeight).toHaveBeenCalledWith(0);

        act(() => fireEvent.click(document.body.querySelector('.build-height-actions button:last-child')));
        expect(state.close).toHaveBeenCalledTimes(1);
    });

    it('numbers the ruler under the slider', () => {
        state.height = 0;
        render(<BuildHeightWidgetView />);

        const labels = Array.from(document.body.querySelectorAll('.build-height-mark-label')).map((node) => node.textContent);

        expect(labels).toEqual(['0', '10', '20', '30', '40']);
    });
});
