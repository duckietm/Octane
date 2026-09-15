import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useWiredArrayInspectionPage } from './useWiredArrayInspectionPage';
import { WIRED_VARIABLES_POLL_MS } from '../../components/wired-tools/WiredCreatorTools.constants';

afterEach(() => vi.useRealTimers());

it('keeps the page across fresh metadata, refreshes it, and resets for a different owner', () => {
    vi.useFakeTimers();
    const request = vi.fn();
    const clear = vi.fn();
    const target = { variableType: 2, requestedOwnerId: 4, definitionItemId: 9 };
    const { result, rerender, unmount } = renderHook(({ current, active }) => useWiredArrayInspectionPage(active, current, request, clear), {
        initialProps: { current: target, active: true }
    });

    expect(request).toHaveBeenLastCalledWith(2, 4, 9, 0, 25);
    act(() => result.current(3));
    expect(request).toHaveBeenLastCalledWith(2, 4, 9, 3, 25);
    request.mockClear();
    rerender({ current: { ...target }, active: true });
    expect(request).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(WIRED_VARIABLES_POLL_MS));
    expect(request).toHaveBeenLastCalledWith(2, 4, 9, 3, 25);
    act(() => result.current(3));
    expect(request).toHaveBeenCalledTimes(2);
    rerender({ current: { ...target, requestedOwnerId: 8 }, active: true });
    expect(request).toHaveBeenLastCalledWith(2, 8, 9, 0, 25);
    rerender({ current: target, active: false });
    expect(clear).toHaveBeenCalled();
    request.mockClear();
    act(() => vi.advanceTimersByTime(WIRED_VARIABLES_POLL_MS * 2));
    expect(request).not.toHaveBeenCalled();
    unmount();
});
