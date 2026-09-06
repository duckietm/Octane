import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@octane/renderer', () => ({
    AddLinkEventTracker: vi.fn(),
    RemoveLinkEventTracker: vi.fn()
}));

vi.mock('../../../../api', () => ({
    FriendlyTime: { format: (seconds: number) => `${seconds}s ago` },
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    OpenUrl: vi.fn(),
    SanitizeHtml: (html: string) => html,
    GetLocalStorage: () => null,
    SetLocalStorage: () => undefined,
    NotificationBubbleType: { FRIENDONLINE: 'friendonline', FRIENDOFFLINE: 'friendoffline', MENTION: 'mention', INFO: 'info', SOUNDMACHINE: 'soundmachine' }
}));

vi.mock('../../../../hooks', async () => {
    const store = await import('../../../../hooks/notification/notificationFeedStore');
    const hook = await import('../../../../hooks/notification/useNotificationFeed');

    return { ...store, ...hook };
});

import { useNotificationFeedStore } from '../../../../hooks/notification/notificationFeedStore';
import { NotificationFeedView } from './NotificationFeedView';

afterEach(cleanup);

beforeEach(() => {
    useNotificationFeedStore.setState({ entries: [], settings: { friends: true, me: true, hotel: true }, isOpen: false, unreadCount: 0 });
});

describe('NotificationFeedView', () => {
    it('starts folded away with the unread count and opens on click', () => {
        useNotificationFeedStore.getState().addEntry({ category: 'me', type: 'info', message: 'You got a badge' });

        render(<NotificationFeedView />);

        expect(screen.getByTestId('feed-unread').textContent).toBe('1');

        fireEvent.click(screen.getByTestId('feed-minimized'));

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

    it('minimizes from the header and remembers it', () => {
        useNotificationFeedStore.getState().setOpen(true);

        render(<NotificationFeedView />);

        fireEvent.click(screen.getByTitle('Minimize'));

        expect(screen.getByTestId('feed-minimized')).toBeTruthy();
        expect(useNotificationFeedStore.getState().isOpen).toBe(false);
    });
});
