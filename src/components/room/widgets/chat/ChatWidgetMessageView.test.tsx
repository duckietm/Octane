/* @vitest-environment jsdom */

import { RoomChatSettings } from '@nitrots/nitro-renderer';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatBubbleMessage } from '../../../../api/room/widgets/ChatBubbleMessage';
import { CHAT_TEXT_SIZE_STORAGE_KEY, ChatTextSize, setStoredChatTextSize } from '../chat-input/chatTextSize';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';

vi.mock('@nitrots/nitro-renderer', () => {
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

describe('ChatWidgetMessageView text size', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.localStorage.setItem(CHAT_TEXT_SIZE_STORAGE_KEY, 'm');
    });

    afterEach(cleanup);

    it('keeps the size captured by the message after the bubble is unmounted and remounted', () => {
        const chat = createMessage();
        const firstRender = renderMessage(chat);
        const bubble = getBubbleContainer(firstRender.container);

        expect(bubble?.style.getPropertyValue('--chat-text-size')).toBe('14px');

        firstRender.unmount();
        act(() => setStoredChatTextSize('xl'));

        const { container } = renderMessage(chat);

        expect(getBubbleContainer(container)?.style.getPropertyValue('--chat-text-size')).toBe('14px');
    });

    it.each<[ChatTextSize, number]>([
        ['s', 12],
        ['m', 14],
        ['l', 16],
        ['xl', 18],
        ['xxl', 21]
    ])('uses the gradual scale for a newly created %s bubble', (size, pixels) => {
        window.localStorage.setItem(CHAT_TEXT_SIZE_STORAGE_KEY, size);

        const { container } = renderMessage();
        const bubble = getBubbleContainer(container);
        const username = container.querySelector('.username');
        const message = container.querySelector('.message');

        expect(bubble?.style.getPropertyValue('--chat-text-size')).toBe(`${pixels}px`);
        expect(username?.closest('.bubble-container')).toBe(bubble);
        expect(message?.closest('.bubble-container')).toBe(bubble);
    });
});
