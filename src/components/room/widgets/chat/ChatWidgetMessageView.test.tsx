/* @vitest-environment jsdom */

import { RoomChatSettings } from '@nitrots/nitro-renderer';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatBubbleMessage } from '../../../../api/room/widgets/ChatBubbleMessage';
import { CHAT_TEXT_SIZE_STORAGE_KEY, setStoredChatTextSize } from '../chat-input/chatTextSize';
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
    UserIdentityView: ({ username }: { username: string }) => <span>{username}: </span>
}));

vi.mock('../../../../hooks', () => ({
    useOnClickChat: () => ({ onClickChat: vi.fn() })
}));

vi.mock('../../../../hooks/session/useSessionSnapshots', () => ({
    useUserDataSnapshot: () => ({ userName: 'Viewer' })
}));

const renderMessage = () => {
    const chat = new ChatBubbleMessage(1, 1, 42, 'hello', 'hello', 'Alice', { x: 100, y: 100 });

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

    it('keeps the size captured when an existing bubble was created', () => {
        const { container } = renderMessage();
        const bubble = getBubbleContainer(container);

        expect(bubble?.style.getPropertyValue('--chat-text-size')).toBe('14px');

        act(() => setStoredChatTextSize('xl'));

        expect(bubble?.style.getPropertyValue('--chat-text-size')).toBe('14px');
    });

    it('uses the gradual scale for a newly created XL bubble', () => {
        window.localStorage.setItem(CHAT_TEXT_SIZE_STORAGE_KEY, 'xl');

        const { container } = renderMessage();

        expect(getBubbleContainer(container)?.style.getPropertyValue('--chat-text-size')).toBe('18px');
    });
});
