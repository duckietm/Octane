/* @vitest-environment jsdom */

import { RoomChatSettings } from '@octane/renderer';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatBubbleMessage } from '../../../../api/room/widgets/ChatBubbleMessage';
import { CHAT_TEXT_SIZE_STORAGE_KEY, ChatTextSize, setStoredChatTextSize } from '../chat-input/chatTextSize';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';
import { BUBBLE_GLIDE_DURATION_MS, BUBBLE_REVEAL_DELAY_MS } from './freeFlowChatLayout';

vi.mock('@octane/renderer', () => {
    return {
        GetRoomEngine: () => ({ selectRoomObject: vi.fn() }),
        RoomChatSettings: {
            CHAT_MODE_FREE_FLOW: 0,
            CHAT_MODE_LINE_BY_LINE: 1,
            CHAT_BUBBLE_WIDTH_WIDE: 0,
            CHAT_BUBBLE_WIDTH_NORMAL: 1,
            CHAT_BUBBLE_WIDTH_THIN: 2,
            CHAT_SCROLL_SPEED_FAST: 0,
            CHAT_SCROLL_SPEED_NORMAL: 1,
            CHAT_SCROLL_SPEED_SLOW: 2,
            FLOOD_FILTER_STRICT: 0,
            FLOOD_FILTER_NORMAL: 1,
            FLOOD_FILTER_LOOSE: 2
        },
        RoomObjectCategory: {
            MINIMUM: -2,
            ROOM: 0,
            FLOOR: 10,
            WALL: 20,
            UNIT: 100,
            CURSOR: 200
        }
    };
});

vi.mock('../../../../api', () => ({
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback
}));

vi.mock('../../../../common', () => ({
    UserIdentityView: ({ nameClassName, username }: { nameClassName: string; username: string }) => <span className={nameClassName}>{username}: </span>
}));

vi.mock('../../../../hooks', () => ({
    useOnClickChat: () => ({ onClickChat: vi.fn() })
}));

vi.mock('../../../../hooks/session/useSessionSnapshots', () => ({
    useUserDataSnapshot: () => ({ userName: 'Viewer' })
}));

const createMessage = () => new ChatBubbleMessage(1, 1, 42, 'hello', 'hello', 'Alice', { x: 100, y: 100 });

const renderMessage = (chat = createMessage()) => {
    return render(
        <div style={{ height: 400 }}>
            <ChatWidgetMessageView chat={chat} makeRoom={vi.fn()} bubbleWidth={RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL} />
        </div>
    );
};

const getBubbleContainer = (container: HTMLElement) => container.querySelector<HTMLElement>('.bubble-container');

describe('ChatWidgetMessageView official bubble rules', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('stays hidden for its first 150 ms and then glides on every later move', () => {
        const { container } = renderMessage();
        const bubble = getBubbleContainer(container);

        expect(bubble?.classList.contains('invisible')).toBe(true);
        expect(bubble?.style.transition).toBe('');

        act(() => vi.advanceTimersByTime(BUBBLE_REVEAL_DELAY_MS));

        expect(bubble?.classList.contains('visible')).toBe(true);
        expect(bubble?.style.transition).toContain(`top ${BUBBLE_GLIDE_DURATION_MS}ms linear`);
    });

    it('shows a hint for a highlight link instead of following it', () => {
        const chat = new ChatBubbleMessage(1, 1, 42, 'look', 'look <a href="highlight/wired%20trigger">here</a>', 'Alice', { x: 100, y: 100 });
        const { container } = renderMessage(chat);
        const link = container.querySelector('a');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        act(() => void link.dispatchEvent(event));

        expect(event.defaultPrevented).toBe(true);
        expect(container.querySelector('.chat-bubble-hint')).toHaveTextContent('WIRED TRIGGER');

        act(() => vi.advanceTimersByTime(2000));

        expect(container.querySelector('.chat-bubble-hint')).toBeNull();
    });
});
