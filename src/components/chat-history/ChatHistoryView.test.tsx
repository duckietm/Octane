/* @vitest-environment jsdom */

import { AddLinkEventTracker, GetSessionDataManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatEntryType, IChatEntry } from '../../api';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';
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

describe('ChatHistoryView in the phone layout', () => {
    const ignoreUser = vi.fn();
    const chatLine = (id: number, webId: number, name: string, message: string, timestamp = '16:18'): IChatEntry =>
        roomInfoEntry({
            id,
            webId,
            entityId: webId,
            name,
            message,
            style: 0,
            chatType: 0,
            imageUrl: 'data:image/png;base64,AA==',
            timestamp,
            type: ChatEntryType.TYPE_CHAT
        });
    const history = (): IChatEntry[] => [
        roomInfoEntry({ id: 1, name: 'Lobby', roomId: 1, timestamp: '16:17' }),
        chatLine(2, 7, 'dennis', 'hallo daar'),
        chatLine(3, 1, 'me', 'hoi'),
        roomInfoEntry({ id: 4, name: 'Soundboard', message: 'dennis played Bell', roomId: 1, timestamp: '16:19' }),
        roomInfoEntry({ id: 5, name: 'Pool', roomId: 2, timestamp: '16:20' }),
        chatLine(6, 9, 'mia', 'splash', '16:21')
    ];
    const asPhone = (orientation: 'portrait' | 'landscape') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));

    beforeEach(() => {
        vi.mocked(AddLinkEventTracker).mockClear();
        showConfirm.mockClear();
        ignoreUser.mockClear();
        ignored.ids = [];
        HTMLElement.prototype.scrollTo = vi.fn();
        vi.mocked(GetSessionDataManager).mockReturnValue({ userId: 1, ignoreUser } as never);
    });

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT, keyboardInset: 0 }));
    });

    it('draws a sheet with one section per room visit, the room event inside it and the live bubbles', () => {
        asPhone('portrait');
        renderVisibleHistory(history());

        expect(document.querySelector('.octane-handheld-chat-history .octane-handheld-sheet')).not.toBeNull();
        expect(document.querySelector('.octane-chat-history')).toBeNull();

        const sections = screen.getAllByRole('region');

        expect(sections.map((section) => section.getAttribute('aria-label'))).toEqual(['Lobby', 'Pool']);
        expect(sections[0]).toHaveTextContent('dennis played Bell');
        expect(screen.getByText('hallo daar').closest('.bubble-container').className).toContain('octane-chat-history-bubble');
        // No room column upright.
        expect(screen.queryByRole('navigation')).toBeNull();
    });

    it('scrolls to the newest line on open and again when the keyboard opens', () => {
        asPhone('portrait');
        renderVisibleHistory(history());

        const scrollTo = vi.mocked(HTMLElement.prototype.scrollTo);

        expect(scrollTo).toHaveBeenCalled();
        expect(scrollTo.mock.contexts.at(-1)).toBe(screen.getByTestId('chat-history-list'));

        const scrolls = scrollTo.mock.calls.length;

        act(() => useHandheldStore.setState({ keyboardInset: 320 }));

        expect(scrollTo.mock.calls.length).toBeGreaterThan(scrolls);
    });

    it('offers ignore on the same lines as the desktop and asks before ignoring', () => {
        ignored.ids = [9];
        asPhone('portrait');
        renderVisibleHistory(history());

        const buttons = document.querySelectorAll('.octane-handheld-chat-history__ignore');

        expect(buttons).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', { name: 'Ignore user: dennis' }));

        expect(showConfirm).toHaveBeenCalledTimes(1);
        expect(ignoreUser).not.toHaveBeenCalled();

        showConfirm.mock.calls[0][1]();

        expect(ignoreUser).toHaveBeenCalledWith(7);
    });

    it('closes from the sheet header like the desktop handle', () => {
        asPhone('portrait');
        renderVisibleHistory(history());

        fireEvent.click(document.querySelector('.octane-handheld-sheet__caption-button.is-close'));

        expect(document.querySelector('.octane-handheld-chat-history')).toBeNull();
    });

    it('lists the rooms at the side on a flat phone, and a room scrolls its section into view', () => {
        asPhone('landscape');
        renderVisibleHistory(history());

        const rooms = screen.getByRole('navigation', { name: 'Rooms' });
        const pool = within(rooms).getByRole('button', { name: /Pool/ });

        expect(within(rooms).getAllByRole('button')).toHaveLength(2);
        expect(pool).toHaveAttribute('aria-current', 'location');

        vi.mocked(HTMLElement.prototype.scrollTo).mockClear();
        fireEvent.click(within(rooms).getByRole('button', { name: /Lobby/ }));

        expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith({ top: expect.any(Number) });
        expect(within(rooms).getByRole('button', { name: /Lobby/ })).toHaveAttribute('aria-current', 'location');
    });

    it('says so when nothing has been said yet', () => {
        asPhone('portrait');
        renderVisibleHistory([]);

        expect(screen.getByText('Nothing has been said yet.')).toBeInTheDocument();
    });

    it('leaves the desktop panel and its unlabelled handle as they were', () => {
        renderVisibleHistory(history());

        expect(document.querySelector('.octane-handheld-chat-history')).toBeNull();
        expect(document.querySelector('.octane-chat-history-scroll')).not.toBeNull();
        expect(document.querySelector('.octane-chat-history-handle')?.hasAttribute('aria-label')).toBe(false);
        expect(document.querySelectorAll('.octane-chat-history-room-info')).toHaveLength(3);
    });
});
