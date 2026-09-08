import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@octane/renderer', () => ({
    AddLinkEventTracker: vi.fn(),
    RemoveLinkEventTracker: vi.fn(),
    MarkMentionsReadComposer: class {}
}));

vi.mock('../../../../api', () => ({
    FriendlyTime: { format: (seconds: number) => `${seconds}s ago` },
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    OpenUrl: vi.fn(),
    SanitizeHtml: (html: string) => html,
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    SendMessageComposer: vi.fn(),
    GetLocalStorage: () => null,
    SetLocalStorage: () => undefined,
    NotificationBubbleType: { FRIENDONLINE: 'friendonline', FRIENDOFFLINE: 'friendoffline', MENTION: 'mention', INFO: 'info', SOUNDMACHINE: 'soundmachine' }
}));

vi.mock('../../../../hooks', async () => {
    const store = await import('../../../../hooks/notification/notificationFeedStore');
    const hook = await import('../../../../hooks/notification/useNotificationFeed');

    return { ...store, ...hook };
});

vi.mock('../../../../hooks/mentions/useMentionActions', () => ({
    useMentionActions: () => ({ open: vi.fn(), goto: vi.fn(), remove: vi.fn() })
}));

vi.mock('../../../../hooks/session/useSessionSnapshots', () => ({
    useUserDataSnapshot: () => ({ userName: 'Me' })
}));

vi.mock('./NotificationFeedMentionView', () => ({
    NotificationFeedMentionView: ({ mention }: { mention: { message: string } }) => <div data-testid="feed-mention">{mention.message}</div>
}));

import { resetMentions, setMentions } from '../../../../hooks/mentions/mentionsStore';
import { useNotificationFeedStore } from '../../../../hooks/notification/notificationFeedStore';
import { NotificationFeedView } from './NotificationFeedView';

afterEach(cleanup);

beforeEach(() => {
    resetMentions();
    useNotificationFeedStore.setState({
        entries: [],
        settings: { mentions: true, friends: true, me: true, hotel: true },
        isOpen: false,
        pane: 'notifications',
        tabBottom: 64,
        unreadCount: 0
    });
});

describe('NotificationFeedView', () => {
    it('starts folded away with the unread count and opens on click', () => {
        useNotificationFeedStore.getState().addEntry({ category: 'me', type: 'info', message: 'You got a badge' });

        render(<NotificationFeedView />);

        expect(screen.getByTestId('feed-unread').textContent).toBe('1');

        const tab = screen.getByTestId('feed-minimized');

        fireEvent.pointerDown(tab, { button: 0, pointerId: 1, clientY: 500 });
        fireEvent.pointerUp(tab, { pointerId: 1, clientY: 500 });

        expect(screen.getByTestId('feed-panel')).toBeTruthy();
        expect(screen.getByText('You got a badge')).toBeTruthy();
        expect(useNotificationFeedStore.getState().unreadCount).toBe(0);
    });

    it('hides a switched-off category in the Notifications pane but keeps it in the Stream', () => {
        const store = useNotificationFeedStore.getState();

        store.addEntry({ category: 'hotel', type: 'broadcast', message: 'Hotel closes at midnight' });
        store.addEntry({ category: 'friends', type: 'friendonline', message: 'Sulake is online' });
        store.setOpen(true);

        render(<NotificationFeedView />);

        fireEvent.click(screen.getByTitle('Settings'));
        fireEvent.click(screen.getByLabelText('Hotel'));
        fireEvent.click(screen.getByTitle('Settings'));

        expect(screen.queryByText('Hotel closes at midnight')).toBeNull();
        expect(screen.getByText('Sulake is online')).toBeTruthy();

        fireEvent.click(screen.getByText('Stream'));

        expect(screen.getByText('Hotel closes at midnight')).toBeTruthy();
    });

    it('lists the mentions in their own section, counts the unread ones and lets the user hide them', () => {
        setMentions([
            {
                mentionId: 1,
                senderId: 2,
                senderUsername: 'Sulake',
                senderFigure: '',
                roomId: 5,
                roomName: 'Lobby',
                message: 'hey @Me',
                mentionType: 0,
                timestamp: 100,
                read: false
            },
            {
                mentionId: 2,
                senderId: 3,
                senderUsername: 'Bob',
                senderFigure: '',
                roomId: 0,
                roomName: '',
                message: 'old one',
                mentionType: 0,
                timestamp: 50,
                read: true
            }
        ]);
        useNotificationFeedStore.getState().addEntry({ category: 'me', type: 'info', message: 'You got a badge' });

        render(<NotificationFeedView />);

        expect(screen.getByTestId('feed-unread').textContent).toBe('2');

        act(() => useNotificationFeedStore.getState().setOpen(true));

        expect(screen.getByText('Mentions')).toBeTruthy();
        expect(screen.getAllByTestId('feed-mention').map((node) => node.textContent)).toEqual(['hey @Me', 'old one']);
        expect(screen.getByTestId('feed-mentions-markall').textContent).toContain('1');

        fireEvent.click(screen.getByTitle('Settings'));
        fireEvent.click(screen.getByLabelText('Mentions'));
        fireEvent.click(screen.getByTitle('Settings'));

        expect(screen.queryByTestId('feed-mention')).toBeNull();
        expect(screen.getByText('You got a badge')).toBeTruthy();

        fireEvent.click(screen.getByText('Stream'));

        expect(screen.getAllByTestId('feed-mention').length).toBe(2);
    });

    it('moves the folded tab when it is dragged and does not open it', () => {
        render(<NotificationFeedView />);

        const tab = screen.getByTestId('feed-minimized');

        fireEvent.pointerDown(tab, { button: 0, pointerId: 1, clientY: 500 });
        fireEvent.pointerMove(tab, { pointerId: 1, clientY: 400 });
        fireEvent.pointerUp(tab, { pointerId: 1, clientY: 400 });

        expect(useNotificationFeedStore.getState().tabBottom).toBe(164);
        expect(useNotificationFeedStore.getState().isOpen).toBe(false);
        expect(screen.getByTestId('feed-minimized').style.bottom).toBe('164px');
    });

    it('flashes the folded tab when a mention arrives', () => {
        render(<NotificationFeedView />);

        expect(screen.getByTestId('feed-minimized').getAttribute('data-flash')).toBeNull();

        act(() =>
            setMentions([
                {
                    mentionId: 9,
                    senderId: 2,
                    senderUsername: 'Sulake',
                    senderFigure: '',
                    roomId: 0,
                    roomName: '',
                    message: 'ping',
                    mentionType: 0,
                    timestamp: 1,
                    read: false
                }
            ])
        );

        expect(screen.getByTestId('feed-minimized').getAttribute('data-flash')).toBe('true');
    });

    it('minimizes from the header and remembers it', () => {
        useNotificationFeedStore.getState().setOpen(true);

        render(<NotificationFeedView />);

        fireEvent.click(screen.getByTitle('Minimize'));

        expect(screen.getByTestId('feed-minimized')).toBeTruthy();
        expect(useNotificationFeedStore.getState().isOpen).toBe(false);
    });
});

describe('NotificationFeedView rows', () => {
    it('renders the decoration picture and the captioned action button of a row', async () => {
        const { OpenUrl } = await import('../../../../api');

        useNotificationFeedStore.setState({ isOpen: true, pane: 'stream' });
        useNotificationFeedStore.getState().addEntry({
            category: 'me',
            type: 'moderator',
            title: 'Message from staff',
            message: 'Read the Habbo Way',
            decorationUrl: 'https://cdn.test/decoration.png',
            linkUrl: 'https://help.test/habbo-way',
            buttonCaption: 'Read more'
        });

        render(<NotificationFeedView />);

        expect(screen.getByTestId('feed-entry-decoration').getAttribute('src')).toBe('https://cdn.test/decoration.png');

        fireEvent.click(screen.getByTestId('feed-entry-button'));

        expect(OpenUrl).toHaveBeenCalledWith('https://help.test/habbo-way');
    });
});
