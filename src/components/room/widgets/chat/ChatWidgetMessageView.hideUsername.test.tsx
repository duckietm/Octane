/* @vitest-environment jsdom */

import { RoomChatSettings } from '@octane/renderer';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatBubbleMessage } from '../../../../api/room/widgets/ChatBubbleMessage';
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
    UserIdentityView: ({ username }: { username: string }) => <span className="username">{username}: </span>
}));

vi.mock('../../../../hooks', () => ({
    useOnClickChat: () => ({ onClickChat: vi.fn() })
}));

vi.mock('../../../../hooks/session/useSessionSnapshots', () => ({
    useUserDataSnapshot: () => ({ userName: 'Viewer' })
}));

const renderBubble = (chat: ChatBubbleMessage) =>
    render(<ChatWidgetMessageView chat={chat} makeRoom={vi.fn()} bubbleWidth={RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL} />);

describe('ChatWidgetMessageView hidden username', () => {
    afterEach(() => cleanup());

    it('shows the speaker name by default', () => {
        const chat = new ChatBubbleMessage(1, 1, 42, 'hello', 'hello', 'Frank', { x: 100, y: 100 });
        const { container } = renderBubble(chat);

        expect(container.querySelector('.username')?.textContent).toBe('Frank: ');
    });

    it('drops the name but keeps the bubble, message and pointer when the bot hides it', () => {
        const chat = new ChatBubbleMessage(1, 1, 42, 'hello', 'hello', 'Frank', { x: 100, y: 100 });
        chat.hideUsername = true;
        const { container } = renderBubble(chat);

        expect(container.querySelector('.username')).toBeNull();
        expect(container.querySelector('.chat-bubble')).not.toBeNull();
        expect(container.querySelector('.message')?.textContent).toBe('hello');
        expect(container.querySelector('.pointer')).not.toBeNull();
    });
});
