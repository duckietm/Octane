/* @vitest-environment jsdom */

import { RoomChatSettings } from '@octane/renderer';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatBubbleMessage } from '../../../../api/room/widgets/ChatBubbleMessage';
import { setStoredChatTextSize } from '../chat-input/chatTextSize';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';

vi.mock('@octane/renderer', () => ({
    GetRoomEngine: () => ({ selectRoomObject: vi.fn() }),
    RoomChatSettings: { CHAT_BUBBLE_WIDTH_WIDE: 0, CHAT_BUBBLE_WIDTH_NORMAL: 1, CHAT_BUBBLE_WIDTH_THIN: 2 },
    RoomObjectCategory: { UNIT: 100 }
}));

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

const textSizeOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[style*="--chat-text-size"]')?.style.getPropertyValue('--chat-text-size');

describe('ChatWidgetMessageView text size', () => {
    beforeEach(() => window.localStorage.clear());
    afterEach(() => cleanup());

    it('keeps the text size a message arrived with when the setting changes', () => {
        setStoredChatTextSize('s');
        const chat = new ChatBubbleMessage(1, 1, 42, 'hello', 'hello', 'Alice', { x: 100, y: 100 });
        chat.textSize = 's';
        const { container } = render(<ChatWidgetMessageView chat={chat} makeRoom={vi.fn()} bubbleWidth={RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL} />);
        const before = textSizeOf(container);

        act(() => setStoredChatTextSize('xxl'));

        expect(before).toBeTruthy();
        expect(textSizeOf(container)).toBe(before);
    });

    it('follows the setting for a message that carries no size of its own', () => {
        setStoredChatTextSize('s');
        const chat = new ChatBubbleMessage(1, 1, 42, 'hello', 'hello', 'Alice', { x: 100, y: 100 });
        const { container } = render(<ChatWidgetMessageView chat={chat} makeRoom={vi.fn()} bubbleWidth={RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL} />);
        const before = textSizeOf(container);

        act(() => setStoredChatTextSize('xxl'));

        expect(textSizeOf(container)).not.toBe(before);
    });
});
