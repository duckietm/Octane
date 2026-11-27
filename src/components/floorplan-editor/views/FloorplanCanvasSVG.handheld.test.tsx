import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../state/handheldStore';
import { initialState } from '../state/reducer';
import { FloorplanCanvasSVG } from './FloorplanCanvasSVG';

// jsdom's pointer events carry no pointerType: it is set on the event before it is dispatched.
const touch = (target: Element, type: 'pointerDown' | 'pointerMove' | 'pointerUp', pointerId: number, clientX: number, clientY: number) => {
    const event = new MouseEvent(type.toLowerCase(), { bubbles: true, cancelable: true, clientX, clientY });

    Object.defineProperty(event, 'pointerType', { value: 'touch' });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    fireEvent(target, event);
};

const state = { ...initialState, tiles: [[{ h: 0, blocked: false }]], brush: { h: 0, action: 'SET' as const } };

describe('FloorplanCanvasSVG on a phone', () => {
    let previousHitTest: unknown;

    beforeEach(() => {
        vi.useFakeTimers();
        previousHitTest = (document as { elementFromPoint?: unknown }).elementFromPoint;
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        (document as { elementFromPoint?: unknown }).elementFromPoint = previousHitTest;
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    const mount = () => {
        const dispatch = vi.fn();
        const { container } = render(<FloorplanCanvasSVG dispatch={dispatch} state={state} />);
        const tile = container.querySelector('polygon[data-row="0"][data-col="0"]') as Element;

        (document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = () => tile;

        return { dispatch, svg: container.querySelector('svg') as SVGSVGElement, container };
    };

    it('draws a tile on a tap', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

        const { dispatch, svg } = mount();

        touch(svg, 'pointerDown', 1, 1024, 0);
        expect(dispatch).not.toHaveBeenCalled();
        touch(svg, 'pointerUp', 1, 1024, 0);

        expect(dispatch.mock.calls[0][0].type).toBe('PAINT_TILE');
    });

    it('draws after a short wait when no second finger comes', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

        const { dispatch, svg } = mount();

        touch(svg, 'pointerDown', 1, 1024, 0);
        act(() => vi.advanceTimersByTime(200));

        expect(dispatch.mock.calls[0][0].type).toBe('PAINT_TILE');
    });

    it('pinches without drawing, and zooms with the finger spread', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

        const { dispatch, svg } = mount();
        const viewBox = svg.getAttribute('viewBox');

        touch(svg, 'pointerDown', 1, 100, 100);
        touch(svg, 'pointerDown', 2, 140, 100);
        touch(svg, 'pointerMove', 2, 260, 100);
        touch(svg, 'pointerUp', 2, 260, 100);
        touch(svg, 'pointerUp', 1, 100, 100);
        act(() => vi.advanceTimersByTime(200));

        expect(dispatch).not.toHaveBeenCalled();
        expect(svg.getAttribute('viewBox')).not.toBe(viewBox);
    });

    it('keeps the desktop behaviour for touch while the phone layout is off', () => {
        const { dispatch, svg } = mount();

        touch(svg, 'pointerDown', 1, 1024, 0);

        expect(dispatch.mock.calls[0][0].type).toBe('PAINT_TILE');
    });
});
