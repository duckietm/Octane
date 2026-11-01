/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    sendMessage: vi.fn()
}));

vi.mock('@octane/renderer', () => ({
    WheelAdminGetPrizesComposer: class {},
    WheelAdminPrizesEvent: class {},
    WheelAdminSavePrizesComposer: class {},
    WheelBuySpinComposer: class {},
    WheelDataEvent: class {},
    WheelOpenComposer: class {},
    WheelRecentWinsEvent: class {},
    WheelResultEvent: class {},
    WheelSpinComposer: class {}
}));

vi.mock('../../api', () => ({ SendMessageComposer: mocks.sendMessage }));

vi.mock('../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler)
}));

vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: vi.fn() }));

import { WheelDataEvent } from '@octane/renderer';
import { useFortuneWheelState } from './useFortuneWheel';

const wheelData = { getParser: () => ({ freeSpins: 0, extraSpins: 1, spinCost: 5, spinCostType: -1, prizes: [] }) };

describe('useFortuneWheelState', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mocks.sendMessage.mockClear();
        mocks.handlers.clear();
    });

    afterEach(() => vi.useRealTimers());

    it('sends one purchase for a double click and the next one after the answer', () => {
        const { result } = renderHook(() => useFortuneWheelState());

        act(() => result.current.buySpin());
        act(() => result.current.buySpin());
        expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
        expect(result.current.isRequestPending).toBe(true);

        act(() => mocks.handlers.get(WheelDataEvent)?.(wheelData));
        expect(result.current.isRequestPending).toBe(false);

        act(() => result.current.buySpin());
        expect(mocks.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('gives the buttons back when no answer comes', () => {
        const { result } = renderHook(() => useFortuneWheelState());

        act(() => result.current.spin());
        act(() => vi.advanceTimersByTime(5000));

        expect(result.current.isRequestPending).toBe(false);
        act(() => result.current.spin());
        expect(mocks.sendMessage).toHaveBeenCalledTimes(2);
    });
});
