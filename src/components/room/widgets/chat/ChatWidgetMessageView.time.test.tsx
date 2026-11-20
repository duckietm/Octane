/* @vitest-environment jsdom */

import { RoomChatSettings } from '@octane/renderer';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatBubbleMessage } from '../../../../api/room/widgets/ChatBubbleMessage';
import { ChatWidgetMessageView, formatChatTime } from './ChatWidgetMessageView';

vi.mock('@octane/renderer', () => ({
    GetRoomEngine: () => ({ selectRoomObject: vi.fn() }),
    RoomChatSettings: { CHAT_BUBBLE_WIDTH_WIDE: 0, CHAT_BUBBLE_WIDTH_NORMAL: 1, CHAT_BUBBLE_WIDTH_THIN: 2 },
    RoomObjectCategory: { UNIT: 100 }
}));

vi.mock('../../../../api', () => ({
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    GetServerMentionAliases: () => null
}));

vi.mock('../../../../common', () => ({
    UserIdentityView: ({ username }: { username: string }) => <span className="username">{username}: </span>
}));

vi.mock('../../../../hooks', () => ({
    useOnClickChat: () => ({ onClickChat: vi.fn() })
}));

vi.mock('../../../../hooks/session/useSessionSnapshots', () => ({
    useUserDataSnapshot: () => ({ userName: 'Viewer' })
}));

const bubble = () => new ChatBubbleMessage(1, 1, 42, 'hello', 'hello', 'tester', { x: 100, y: 100 });

describe('chat bubble time', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('remembers when the client received the message', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 10, 15, 10, 58, 12));

        expect(bubble().receivedAt).toBe(new Date(2026, 10, 15, 10, 58, 12).getTime());
    });

    it('formats the time in full, on 24 hours', () => {
        expect(formatChatTime(new Date(2026, 10, 15, 9, 5, 7).getTime())).toBe('09:05:07');
        expect(formatChatTime(new Date(2026, 10, 15, 22, 58, 12).getTime())).toBe('22:58:12');
    });

    it('carries the time on a room bubble', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 10, 15, 10, 58, 12));

        const { container } = render(
            <ChatWidgetMessageView chat={bubble()} makeRoom={vi.fn()} bubbleWidth={RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL} />
        );

        expect(container.querySelector('.chat-bubble-time')?.textContent).toBe('10:58:12');
    });

    it('leaves the time out of the chat history', () => {
        const { container } = render(
            <ChatWidgetMessageView chat={bubble()} makeRoom={vi.fn()} bubbleWidth={RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL} layout="history" />
        );

        expect(container.querySelector('.chat-bubble-time')).toBeNull();
    });
});
