import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialState } from '../state/reducer';
import { FloorplanToolbar } from './FloorplanToolbar';

describe('FloorplanToolbar', () => {
    afterEach(() => cleanup());

    it('clicking SET button dispatches BRUSH_SET action=SET', () => {
        const dispatch = vi.fn();
        const { getByTestId } = render(<FloorplanToolbar state={initialState} dispatch={dispatch} />);
        fireEvent.click(getByTestId('tool-set'));
        expect(dispatch).toHaveBeenCalledWith({ type: 'BRUSH_SET', action: 'SET' });
    });

    it('all 5 brush actions are reachable', () => {
        const dispatch = vi.fn();
        const { getByTestId } = render(<FloorplanToolbar state={initialState} dispatch={dispatch} />);
        fireEvent.click(getByTestId('tool-unset'));
        fireEvent.click(getByTestId('tool-up'));
        fireEvent.click(getByTestId('tool-down'));
        fireEvent.click(getByTestId('tool-door'));
        const types = dispatch.mock.calls.map((c) => c[0].action);
        expect(types).toEqual(['UNSET', 'UP', 'DOWN', 'DOOR']);
    });

    it('can hide the room-entry tool for external floor-plan sessions', () => {
        const { queryByTestId } = render(<FloorplanToolbar state={initialState} dispatch={() => {}} includeDoor={false} />);
        expect(queryByTestId('tool-door')).toBeNull();
    });

    it('select-all dispatches SELECT_ALL + APPLY_BRUSH_TO_SELECTION (bulk-apply UX)', () => {
        const dispatch = vi.fn();
        const { getByTestId } = render(<FloorplanToolbar state={initialState} dispatch={dispatch} />);
        fireEvent.click(getByTestId('tool-select-all'));
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'SELECT_ALL' });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
    });

    it('square-select dispatches SQUARE_SELECT_TOGGLE', () => {
        const dispatch = vi.fn();
        const { getByTestId } = render(<FloorplanToolbar state={initialState} dispatch={dispatch} />);
        fireEvent.click(getByTestId('tool-square-select'));
        expect(dispatch).toHaveBeenCalledWith({ type: 'SQUARE_SELECT_TOGGLE' });
    });

    it('marks active brush button with data-active', () => {
        const state = { ...initialState, brush: { h: 0, action: 'UP' as const } };
        const { getByTestId } = render(<FloorplanToolbar state={state} dispatch={() => {}} />);
        expect(getByTestId('tool-up').getAttribute('data-active')).toBe('true');
        expect(getByTestId('tool-set').getAttribute('data-active')).toBe('false');
    });
});
