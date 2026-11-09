/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { handlers, on } = vi.hoisted(() => {
    const handlers = new Map<unknown, (event: any) => void>();
    const on = (type: unknown, handler: (event: any) => void) => {
        for (const key of Array.isArray(type) ? type : [type]) handlers.set(key, handler);
    };
    return { handlers, on };
});

vi.mock('@octane/renderer', async (importOriginal) => {
    const real = await importOriginal<Record<string, unknown>>();
    const stubs = new Map<string, unknown>();
    // Classes the shared mock leaves out: only their identity matters here.
    const stub = (name: string) => {
        if (!stubs.has(name)) stubs.set(name, class { static readonly stubName = name; });
        return stubs.get(name);
    };
    return new Proxy(real, { get: (target, prop: string) => (prop in target || prop === 'then' ? target[prop] : stub(prop)), has: (_, prop) => prop !== 'then' });
});
// The hook itself, without the shared host: one consumer is all this test needs.
vi.mock('@/state/useSharedHook', () => ({ useSharedHook: (hook: () => unknown) => hook(), registerSharedHook: () => {} }));
vi.mock('../events', () => ({ useMessageEvent: on, useOctaneEvent: on }));
vi.mock('../notification', () => ({ useNotification: () => ({ simpleAlert: () => {}, showConfirm: () => {} }) }));
vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    GetSessionDataManager: () => ({ userId: 1 }),
    SendMessageComposer: () => {}
}));

import { FriendListUpdateEvent } from '@octane/renderer';
import { useFriends } from './useFriends';

const listUpdate = (added: number[], removed: number[]) => ({
    getParser: () => ({ categories: [], updatedFriends: [], addedFriends: added.map((id) => ({ id })), removedFriendIds: removed })
});

describe('useFriends sent requests', () => {
    it('lets a user be asked again once the friendship ended', () => {
        const { result } = renderHook(() => useFriends());

        act(() => void result.current.requestFriend(7, 'seven'));
        expect(result.current.canRequestFriend(7)).toBe(false);

        // Accepted, then removed: "Add friend" stayed hidden for this user until the page was reloaded.
        act(() => handlers.get(FriendListUpdateEvent)(listUpdate([7], [])));
        act(() => handlers.get(FriendListUpdateEvent)(listUpdate([], [7])));

        expect(result.current.canRequestFriend(7)).toBe(true);
    });

    it('keeps a request pending while its user has not answered', () => {
        const { result } = renderHook(() => useFriends());

        act(() => void result.current.requestFriend(7, 'seven'));
        act(() => handlers.get(FriendListUpdateEvent)(listUpdate([8], [])));

        expect(result.current.canRequestFriend(7)).toBe(false);
    });
});
