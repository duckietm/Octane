import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    AddAnimationTickerCallback: () => () => {},
    GetRoomSession: () => ({ roomId: 1 }),
    GetRoomObjectBounds: () => null,
    GetRoomObjectScreenLocation: () => null
}));

import { ContextMenuView } from './ContextMenuView';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

const bubble = (onClose: () => void) => <ContextMenuView category={20} fades objectId={1} onClose={onClose} userType={1} />;

describe('ContextMenuView fade', () => {
    it('closes five seconds after it opened, however often the parent renders', () => {
        const closed = vi.fn();
        const view = render(bubble(() => closed()));

        for (let second = 0; second < 5; second++) {
            act(() => void vi.advanceTimersByTime(1000));
            // The parent passes a new inline onClose each render: the countdown used to start again.
            view.rerender(bubble(() => closed()));
        }
        act(() => void vi.advanceTimersByTime(100));

        expect(closed).toHaveBeenCalledTimes(1);
    });

    it('does not close anything after it unmounted mid-fade', () => {
        const closed = vi.fn();
        const view = render(bubble(closed));

        act(() => void vi.advanceTimersByTime(5000));
        view.unmount();
        act(() => void vi.advanceTimersByTime(100));

        expect(closed).not.toHaveBeenCalled();
    });
});
