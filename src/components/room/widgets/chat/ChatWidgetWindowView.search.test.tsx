/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatWidgetWindowView } from './ChatWidgetWindowView';

const ROOM_ID = 7;
const CHAT = 1;

vi.mock('@octane/renderer', () => ({
    GetSessionDataManager: () => ({ userId: 1 }),
    RoomObjectType: { PET: 2 }
}));

vi.mock('../../../../api', () => ({
    ChatEntryType: { TYPE_CHAT: 1 },
    LocalizeText: (key: string) => key,
    SanitizeHtml: (html: string) => html,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../common', () => ({
    DraggableWindowPosition: { TOP_LEFT: 'top_left' },
    OctaneCardView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    OctaneCardHeaderView: () => null,
    OctaneCardContentView: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));

vi.mock('../../../../common/Checkbox', () => ({ Checkbox: () => null }));

vi.mock('../../../../common/BaseButton', () => ({
    BaseButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>
}));

const entry = (id: number, name: string, message: string) => ({
    id,
    webId: 2,
    name,
    message,
    type: CHAT,
    roomId: ROOM_ID,
    entityType: 1,
    timestamp: `t${id}`,
    style: 0,
    chatType: 0
});

vi.mock('../../../../hooks', () => ({
    useChatHistory: () => ({ chatHistory: [entry(1, 'Frank', 'hello there'), entry(2, 'Anna', 'good night')], clearChatHistory: vi.fn() }),
    useChatWindow: () => [true, vi.fn()],
    useOnClickChat: () => ({ onClickChat: vi.fn() })
}));

vi.mock('../../../../hooks/rooms', () => ({
    useRoom: () => ({ roomSession: { roomId: ROOM_ID } })
}));

describe('ChatWidgetWindowView search', () => {
    afterEach(() => cleanup());

    it('starts empty, shows what is typed and filters the history by it', () => {
        Element.prototype.scrollTo = vi.fn();

        const { container } = render(<ChatWidgetWindowView />);
        const input = screen.getByPlaceholderText('Search') as HTMLInputElement;

        expect(input.value).toBe('');
        expect(container.textContent).toContain('hello there');
        expect(container.textContent).toContain('good night');

        fireEvent.change(input, { target: { value: 'night' } });

        expect(input.value).toBe('night');
        expect(container.textContent).not.toContain('hello there');
        expect(container.textContent).toContain('good night');
    });
});
