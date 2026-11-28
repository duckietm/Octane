/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';
import { RewardTrackScrollList } from './RewardTrackScrollList';

const renderList = (onRow = vi.fn()) => {
    const view = render(
        <RewardTrackScrollList className="list" contentClassName="content" height={100}>
            <button type="button" onClick={onRow}>
                row
            </button>
        </RewardTrackScrollList>
    );
    const viewport = view.container.querySelector('.octane-reward-track-scroll-viewport') as HTMLElement;
    const lift = () => (view.container.querySelector('.octane-reward-track-scrollbar-lift') as HTMLElement).style.transform;

    return { ...view, viewport, lift, onRow };
};

const swipe = (target: HTMLElement, pointerType: string, fromY: number, toY: number) => {
    fireEvent.pointerDown(target, { pointerId: 1, pointerType, clientY: fromY });
    fireEvent.pointerMove(target, { pointerId: 1, pointerType, clientY: toY });
    fireEvent.pointerUp(target, { pointerId: 1, pointerType, clientY: toY });
};

describe('RewardTrackScrollList touch', () => {
    beforeEach(() => {
        // Every element measures 500 px: the 100 px list holds 500 px of rows, a 400 px range.
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(500);
    });

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        vi.restoreAllMocks();
    });

    it('follows a finger dragged over the rows on a phone, and the tap that ends the drag is no click', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        const { viewport, lift, onRow, getByRole } = renderList();

        expect(lift()).toBe('translateY(0px)');

        swipe(viewport, 'touch', 300, 200);

        // 100 px of a 400 px range is a quarter; the lift travels 80 px.
        expect(lift()).toBe('translateY(20px)');

        fireEvent.click(getByRole('button', { name: 'row' }));
        expect(onRow).not.toHaveBeenCalled();

        fireEvent.click(getByRole('button', { name: 'row' }));
        expect(onRow).toHaveBeenCalledTimes(1);
    });

    it('treats a short touch as a tap', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        const { viewport, lift, onRow, getByRole } = renderList();

        swipe(viewport, 'touch', 300, 296);
        fireEvent.click(getByRole('button', { name: 'row' }));

        expect(lift()).toBe('translateY(0px)');
        expect(onRow).toHaveBeenCalledTimes(1);
    });

    it('does not move with a mouse drag or outside the phone layout', () => {
        const { viewport, lift } = renderList();

        swipe(viewport, 'touch', 300, 200);
        expect(lift()).toBe('translateY(0px)');

        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        swipe(viewport, 'mouse', 300, 200);
        expect(lift()).toBe('translateY(0px)');
    });
});
