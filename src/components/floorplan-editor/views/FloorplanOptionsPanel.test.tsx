import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialState } from '../state/reducer';
import { FloorplanOptionsPanel } from './FloorplanOptionsPanel';

describe('FloorplanOptionsPanel', () => {
    afterEach(() => cleanup());
    it('clicking entry direction cycles 0..7', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, door: { x: 0, y: 0, dir: 2 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);
        fireEvent.click(getByTestId('entry-dir'));
        expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DOOR_DIR', dir: 3, source: 'local' });
    });

    it('turns like AIR: left steps the direction up, right steps it down, wrapping at 0 and 7', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, door: { x: 0, y: 0, dir: 0 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);

        fireEvent.click(getByTestId('entry-dir-prev'));
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_DOOR_DIR', dir: 1, source: 'local' });
        fireEvent.click(getByTestId('entry-dir-next'));
        expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_DOOR_DIR', dir: 7, source: 'local' });
        expect(getByTestId('entry-dir').getAttribute('data-dir')).toBe('0');
    });

    it('wraps from 7 back to 0', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, door: { x: 0, y: 0, dir: 7 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);
        fireEvent.click(getByTestId('entry-dir'));
        expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DOOR_DIR', dir: 0, source: 'local' });
    });

    it('wall thickness stepper dispatches SET_THICKNESS for the next thicker level', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, thickness: { wall: 2 as const, floor: 1 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);
        fireEvent.click(getByTestId('wall-thickness-up'));
        expect(dispatch).toHaveBeenCalledWith({ type: 'SET_THICKNESS', wall: 3, source: 'local' });
    });

    it('floor thickness stepper dispatches SET_THICKNESS for the next thinner level', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, thickness: { wall: 1 as const, floor: 1 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);
        fireEvent.click(getByTestId('floor-thickness-down'));
        expect(dispatch).toHaveBeenCalledWith({ type: 'SET_THICKNESS', floor: 0, source: 'local' });
    });

    it('the arrows stop at the thinnest and thickest levels', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, thickness: { wall: 3 as const, floor: 0 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);
        fireEvent.click(getByTestId('wall-thickness-up'));
        fireEvent.click(getByTestId('floor-thickness-down'));
        expect(dispatch).not.toHaveBeenCalled();
        expect(getByTestId('wall-thickness').getAttribute('data-value')).toBe('3');
        expect(getByTestId('floor-thickness').getAttribute('data-value')).toBe('0');
    });

    it('clicking the label cycles through the levels and wraps', () => {
        const dispatch = vi.fn();
        const state = { ...initialState, thickness: { wall: 3 as const, floor: 2 as const } };
        const { getByTestId } = render(<FloorplanOptionsPanel state={state} dispatch={dispatch} />);
        fireEvent.click(getByTestId('wall-thickness-label'));
        fireEvent.click(getByTestId('floor-thickness-label'));
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'SET_THICKNESS', wall: 0, source: 'local' });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'SET_THICKNESS', floor: 3, source: 'local' });
    });
});
