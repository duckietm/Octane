/* @vitest-environment jsdom */
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const wheel = vi.hoisted(() => ({
    finishSpin: vi.fn(),
    pendingPrizeId: -1,
    freeSpins: 0,
    extraSpins: 0,
    trackers: [] as { linkReceived: (url: string) => void }[]
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    AddLinkEventTracker: vi.fn((tracker) => wheel.trackers.push(tracker)),
    GetConfiguration: () => ({ getValue: (_key: string, value: unknown) => value }),
    RemoveLinkEventTracker: vi.fn()
}));
vi.mock('../../hooks', () => ({
    useHasPermission: () => false,
    useFortuneWheel: () => ({
        freeSpins: wheel.freeSpins,
        extraSpins: wheel.extraSpins,
        spinCost: 0,
        spinCostType: -1,
        prizes: [{ id: 4 }, { id: 5 }],
        recentWins: [],
        pendingPrizeId: wheel.pendingPrizeId,
        isSpinning: wheel.pendingPrizeId >= 0,
        open: vi.fn(),
        spin: vi.fn(),
        buySpin: vi.fn(),
        finishSpin: wheel.finishSpin
    })
}));

import { FortuneWheelView } from './FortuneWheelView';

// The window is drawn in a portal, outside the render container.
const counts = () => Array.from(document.body.querySelectorAll('.wheel-spins-count')).map((node) => node.textContent);

describe('FortuneWheelView', () => {
    it('ends a spin whose result arrives while the window is closed, so the wheel is not stuck', () => {
        wheel.pendingPrizeId = 5;

        render(<FortuneWheelView />);

        expect(wheel.finishSpin).toHaveBeenCalledTimes(1);
    });

    it('keeps the spin counters of before the spin until the wheel stops, so a won extra spin is not given away', () => {
        wheel.pendingPrizeId = -1;
        wheel.freeSpins = 1;
        wheel.extraSpins = 3;
        wheel.trackers = [];

        const { rerender } = render(<FortuneWheelView />);

        act(() => wheel.trackers.forEach((tracker) => tracker.linkReceived('fortune-wheel/show')));
        expect(counts()).toEqual(['1', '3']);

        // The server answers the spin with the result, then the new counts (one spent, two won).
        wheel.pendingPrizeId = 5;
        wheel.extraSpins = 4;
        rerender(<FortuneWheelView />);

        expect(counts()).toEqual(['1', '3']);
        expect(document.body.querySelectorAll('.wheel-slice-plate')).toHaveLength(2);
    });
});
