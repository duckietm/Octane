/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    sendMessage: vi.fn()
}));

vi.mock('@octane/renderer', () => ({
    CatalogGroupsComposer: class {},
    GroupPurchasedEvent: class {},
    GuildMembershipsMessageEvent: class {}
}));

vi.mock('../../api', () => ({ SendMessageComposer: mocks.sendMessage }));

vi.mock('../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler)
}));

vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: vi.fn() }));

import { GroupPurchasedEvent } from '@octane/renderer';
import { useUserGroupsStore } from './useUserGroups';

describe('useUserGroupsStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mocks.sendMessage.mockClear();
        mocks.handlers.clear();
    });

    afterEach(() => vi.useRealTimers());

    it('asks once on mount and again on refresh only after 5 s', () => {
        const { result } = renderHook(() => useUserGroupsStore());

        expect(mocks.sendMessage).toHaveBeenCalledTimes(1);

        act(() => vi.advanceTimersByTime(3000));
        act(() => result.current.refresh());
        expect(mocks.sendMessage).toHaveBeenCalledTimes(1);

        act(() => vi.advanceTimersByTime(3000));
        act(() => result.current.refresh());
        expect(mocks.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('asks again after a group purchase', () => {
        renderHook(() => useUserGroupsStore());

        act(() => mocks.handlers.get(GroupPurchasedEvent)?.({}));

        expect(mocks.sendMessage).toHaveBeenCalledTimes(2);
    });
});
