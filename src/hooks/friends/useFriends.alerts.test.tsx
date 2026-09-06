/* @vitest-environment jsdom */

import { FriendListFragmentEvent, MessengerInitEvent } from '@octane/renderer';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockEventDispatcher } from '../../octane-renderer.mock';
import { SharedHookRegistry } from '../../state/useSharedHook';
import { useFriends } from './useFriends';

const simpleAlert = vi.fn();

vi.mock('../notification', () => ({
    useNotification: () => ({ simpleAlert, showSingleBubble: vi.fn() })
}));

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api')>('../../api');

    return { ...actual, SendMessageComposer: vi.fn() };
});

const wrapper = ({ children }: { children: React.ReactNode }) => <SharedHookRegistry>{children}</SharedHookRegistry>;

// The stub dispatcher routes by the event's class name, which the real types do not declare.
const withParser = <T extends object>(event: T, parser: object): T & { type: string } => {
    (event as { getParser: () => object }).getParser = () => parser;

    return event as T & { type: string };
};

const initMessenger = (userFriendLimit: number, extendedFriendLimit: number) =>
    act(() => {
        mockEventDispatcher.dispatchEvent(
            withParser(new MessengerInitEvent(() => undefined), { userFriendLimit, normalFriendLimit: userFriendLimit, extendedFriendLimit, categories: [] })
        );
    });

const addFriend = (id: number, name: string) =>
    act(() => {
        mockEventDispatcher.dispatchEvent(withParser(new FriendListFragmentEvent(() => undefined), { fragment: [{ id, name, online: false, categoryId: 0 }] }));
    });

describe('useFriends feedback alerts', () => {
    beforeEach(() => {
        simpleAlert.mockClear();
        window.localStorage.clear();
    });

    afterEach(cleanup);

    it('confirms with an alert that the friend request went out', async () => {
        const { result } = renderHook(() => useFriends(), { wrapper });

        await waitFor(() => expect(result.current).not.toBeNull());

        initMessenger(500, 3000);

        act(() => void result.current.requestFriend(12, 'Alice'));

        expect(simpleAlert).toHaveBeenCalledTimes(1);
        // The renderer stub has no texts, so the English fallback is what shows.
        expect(simpleAlert.mock.calls[0][0]).toContain('Alice has been sent your friend request');
        expect(simpleAlert.mock.calls[0][4]).toBe('Notice!');
    });

    it('refuses a request with the list-full alert once the friend limit is reached', async () => {
        const { result } = renderHook(() => useFriends(), { wrapper });

        await waitFor(() => expect(result.current).not.toBeNull());

        initMessenger(1, 3);
        addFriend(5, 'Bob');

        await waitFor(() => expect(result.current.friends).toHaveLength(1));

        let sent: boolean | void;

        act(() => {
            sent = result.current.requestFriend(12, 'Alice');
        });

        expect(sent).toBe(false);
        expect(simpleAlert).toHaveBeenCalledTimes(1);
        expect(simpleAlert.mock.calls[0][0]).toContain('You have 1 friends');
        expect(result.current.sentRequests).not.toContain(12);
    });
});
