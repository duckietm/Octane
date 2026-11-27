/* @vitest-environment jsdom */

import { AddLinkEventTracker, GetSessionDataManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatEntryType, IChatEntry } from '../../api';
import { useChatHistory } from '../../hooks';
import { canIgnoreFromHistory, ChatHistoryView } from './ChatHistoryView';

const showConfirm = vi.hoisted(() => vi.fn());
const ignored = vi.hoisted(() => ({ ids: [] as number[] }));

vi.mock('../../hooks', () => ({
    useChatHistory: vi.fn(),
    useIgnoredUsersSnapshot: () => ignored.ids,
    useNotification: () => ({ showConfirm }),
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

describe('ChatHistoryView ignore cross', () => {
    const ignoreUser = vi.fn();
    const chatEntry = (webId: number, name: string): IChatEntry =>
        roomInfoEntry({ id: webId, webId, entityId: webId, name, message: `hi from ${name}`, style: 0, chatType: 0, imageUrl: 'data:image/png;base64,AA==', type: ChatEntryType.TYPE_CHAT });

    beforeEach(() => {
        vi.mocked(AddLinkEventTracker).mockClear();
        showConfirm.mockClear();
        ignoreUser.mockClear();
        ignored.ids = [];
        HTMLElement.prototype.scrollTo = vi.fn();
        vi.mocked(GetSessionDataManager).mockReturnValue({ userId: 1, ignoreUser } as never);
    });

    afterEach(cleanup);

    it('offers the cross on lines of other players who are not ignored yet', () => {
        expect(canIgnoreFromHistory({ type: ChatEntryType.TYPE_CHAT, webId: 7 }, 1, [])).toBe(true);
        expect(canIgnoreFromHistory({ type: ChatEntryType.TYPE_CHAT, webId: 1 }, 1, [])).toBe(false);
        expect(canIgnoreFromHistory({ type: ChatEntryType.TYPE_CHAT, webId: 7 }, 1, [7])).toBe(false);
        expect(canIgnoreFromHistory({ type: ChatEntryType.TYPE_CHAT, webId: -1 }, 1, [])).toBe(false);
        expect(canIgnoreFromHistory({ type: ChatEntryType.TYPE_ROOM_INFO, webId: 7 }, 1, [])).toBe(false);
    });

    it('asks first and ignores the player only after the confirmation', () => {
        ignored.ids = [9];
        renderVisibleHistory([chatEntry(1, 'me'), chatEntry(7, 'dennis'), chatEntry(9, 'muted')]);

        const crosses = document.querySelectorAll('.octane-chat-history-ignore');

        expect(crosses).toHaveLength(1);

        fireEvent.click(crosses[0]);

        expect(showConfirm).toHaveBeenCalledTimes(1);
        expect(ignoreUser).not.toHaveBeenCalled();

        showConfirm.mock.calls[0][1]();

        expect(ignoreUser).toHaveBeenCalledWith(7);
    });
});
