/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { handlers } = vi.hoisted(() => ({ handlers: new Map<unknown, (event: any) => void>() }));

vi.mock('@octane/renderer', async (importOriginal) => {
    const names = [
        'ConsoleReadReceiptEvent',
        'ConsoleTypingComposer',
        'FriendIsTypingEvent',
        'FriendListUpdateEvent',
        'InstantMessageErrorEvent',
        'MarkConsoleReadComposer',
        'MessengerMessageAckEvent',
        'MessengerMessageEvent',
        'MessengerMessageFailedEvent',
        'NewConsoleMessageEvent',
        'RoomInviteErrorEvent',
        'RoomInviteEvent',
        'SendMessageComposer',
        'SendMessengerMessageComposer'
    ];

    return {
        ...(await importOriginal<object>()),
        ...Object.fromEntries(names.map((name) => [name, class {}])),
        MessengerMessageType: { Habbicon: 2 }
    };
});
vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: (hook: () => unknown) => hook() }));
vi.mock('../events', () => ({ useMessageEvent: (type: unknown, handler: (event: any) => void) => handlers.set(type, handler) }));
vi.mock('../notification', () => ({ useNotification: () => ({ simpleAlert: vi.fn() }) }));
vi.mock('../translation', () => ({ useTranslation: () => ({ settings: { enabled: false }, translateIncoming: vi.fn() }) }));
vi.mock('./messenger', () => ({
    useMessengerHistory: () => ({ loadInitial: vi.fn(), loadOlder: vi.fn() }),
    useMessengerRealtime: () => ({ conversationIds: [], conversationsById: {}, historyByConversation: {} })
}));
vi.mock('./useFriends', () => ({ useFriends: () => ({ getFriend: () => null }) }));

import { FriendIsTypingEvent, NewConsoleMessageEvent } from '@octane/renderer';
import { useMessenger } from './useMessenger';

const typing = (senderId: number, isTyping = true) => ({ getParser: () => ({ senderId, isTyping }) });

describe('useMessenger typing indicator', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('drops the indicator when a message from that friend arrives', () => {
        const { result } = renderHook(() => useMessenger());

        act(() => handlers.get(FriendIsTypingEvent)(typing(5)));
        expect(result.current.typingUserIds).toEqual([5]);

        act(() => handlers.get(NewConsoleMessageEvent)({ getParser: () => ({ senderId: 5, messageText: 'hi', secondsSinceSent: 0, extraData: null }) }));

        expect(result.current.typingUserIds).toEqual([]);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('clears the typing timers on unmount', () => {
        const { unmount } = renderHook(() => useMessenger());
        const timersBefore = vi.getTimerCount();

        act(() => handlers.get(FriendIsTypingEvent)(typing(5)));
        act(() => handlers.get(FriendIsTypingEvent)(typing(6)));
        expect(vi.getTimerCount()).toBe(timersBefore + 2);

        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
