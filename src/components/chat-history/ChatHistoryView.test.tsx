/* @vitest-environment jsdom */

import { AddLinkEventTracker } from '@octane/renderer';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatEntryType, IChatEntry } from '../../api';
import { useChatHistory } from '../../hooks';
import { ChatHistoryView } from './ChatHistoryView';

vi.mock('../../hooks', () => ({
    useChatHistory: vi.fn(),
    useOnClickChat: () => ({ onClickChat: vi.fn() })
}));

vi.mock('../../hooks/session/useSessionSnapshots', () => ({
    useUserDataSnapshot: () => ({ userName: 'Viewer' })
}));

const roomInfoEntry = (overrides: Partial<IChatEntry> = {}): IChatEntry => ({
    id: 1,
    webId: -1,
    entityId: -1,
    name: 'Soundboard',
    roomId: 42,
    timestamp: '16:17',
    type: ChatEntryType.TYPE_ROOM_INFO,
    ...overrides
});

const renderVisibleHistory = (chatHistory: IChatEntry[]) => {
    vi.mocked(useChatHistory).mockReturnValue({ chatHistory } as ReturnType<typeof useChatHistory>);
    render(<ChatHistoryView />);

    const tracker = vi.mocked(AddLinkEventTracker).mock.calls[0][0];

    act(() => tracker.linkReceived('chat-history/show'));
};

describe('ChatHistoryView room information', () => {
    beforeEach(() => {
        vi.mocked(AddLinkEventTracker).mockClear();
        HTMLElement.prototype.scrollTo = vi.fn();
    });

    afterEach(cleanup);

    it('shows the playback message for a soundboard room event', () => {
        renderVisibleHistory([roomInfoEntry({ message: 'Simoleo ha riprodotto Campanella' })]);

        expect(screen.getByText('Simoleo ha riprodotto Campanella')).toBeInTheDocument();
        expect(screen.queryByText('Soundboard')).not.toBeInTheDocument();
    });

    it('keeps showing the room name when a room event has no message', () => {
        renderVisibleHistory([roomInfoEntry({ name: 'Sala da pranzo' })]);

        expect(screen.getByText('Sala da pranzo')).toBeInTheDocument();
    });

    it('draws a chat line with the live chat bubble, in the flow of the list', () => {
        renderVisibleHistory([
            roomInfoEntry({
                id: 2,
                webId: 7,
                entityId: 3,
                name: 'dennis',
                message: 'hallo daar',
                style: 0,
                chatType: 0,
                color: '#ff0000',
                imageUrl: 'data:image/png;base64,AA==',
                type: ChatEntryType.TYPE_CHAT
            })
        ]);

        const message = screen.getByText('hallo daar');
        const bubble = message.closest('.bubble-container');

        expect(bubble).not.toBeNull();
        expect(bubble.className).toContain('octane-chat-history-bubble');
        expect(bubble.className).toContain('relative');
        expect(bubble.className).not.toContain('absolute');
        expect(bubble.querySelector('.chat-bubble').className).toContain('max-w-[335px]');
        expect(screen.getByText('dennis', { exact: false })).toBeInTheDocument();
    });
});
