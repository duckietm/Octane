import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloorplanState } from '../state/types';
import { Floorplan3DView } from './Floorplan3DView';

vi.mock('../scene3d/FloorplanScene', () => ({
    FloorplanScene: { create: vi.fn(() => Promise.reject(new Error('no webgl'))) }
}));

const state = {
    tiles: [[{ h: 0, blocked: false }]],
    door: { x: 0, y: 0, dir: 2 },
    thickness: { wall: 1, floor: 1 },
    wallHeight: -1,
    brush: { h: 0, action: 'SET' },
    selection: new Set(),
    squareSelect: false
} as unknown as FloorplanState;

describe('Floorplan3DView', () => {
    afterEach(() => cleanup());

    it('shows a loading state, then reports when the scene cannot be created', async () => {
        const originalObserver = globalThis.ResizeObserver;
        globalThis.ResizeObserver = class {
            observe() {}
            disconnect() {}
            unobserve() {}
        };

        const { getByTestId, findByTestId } = render(<Floorplan3DView state={state} dispatch={() => {}} />);

        expect(getByTestId('floorplan-3d-loading')).toBeTruthy();
        await act(async () => {});
        expect(await findByTestId('floorplan-3d-unavailable')).toBeTruthy();
        expect((getByTestId('view3d-rotate') as HTMLButtonElement).disabled).toBe(true);

        globalThis.ResizeObserver = originalObserver;
    });
});
