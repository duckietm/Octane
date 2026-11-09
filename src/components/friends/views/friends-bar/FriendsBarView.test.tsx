/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessengerFriend } from '../../../../api';
import { useFriends } from '../../../../hooks';
import { FriendNotificationType } from '../../../../hooks/friends/friendBarNotifications.helpers';
import { useFriendBarNotificationsStore } from '../../../../hooks/friends/friendBarNotificationsStore';
import { FriendBarView } from './FriendsBarView';

vi.mock('../../../../hooks', () => ({ useFriends: vi.fn() }));
vi.mock('../../../../common/layout/LayoutAvatarImageView', () => ({ LayoutAvatarImageView: () => null }));
vi.mock('../../../../common/layout/LayoutBadgeImageView', () => ({ LayoutBadgeImageView: () => null }));
vi.mock('../../StaffChatFrankIconView', () => ({
    StaffChatFrankIconView: (props: { className?: string; size: number }) => <div className={props.className} data-size={props.size} />
}));

const makeFriend = (id: number, name: string): MessengerFriend => ({ id, name, figure: '', online: true }) as MessengerFriend;

describe('AIR friend bar paging', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1870 });

        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            bottom: 55,
            height: 40,
            left: 1538,
            right: 1870,
            top: 15,
            width: 332,
            x: 1538,
            y: 15,
            toJSON: () => ({})
        });

        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe() {}
                disconnect() {}
            }
        );

        vi.mocked(useFriends).mockReturnValue({ followFriend: vi.fn() } as unknown as ReturnType<typeof useFriends>);
    });

    afterEach(() => {
        cleanup();
        useFriendBarNotificationsStore.getState().reset();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('shows Staff Chat and two friends before paging to the fourth entry', async () => {
        const friends = [makeFriend(-1, 'Staff Chat'), makeFriend(1, 'Alice'), makeFriend(2, 'Bruno'), makeFriend(3, 'Carla')];
        const { container } = render(<FriendBarView onlineFriends={friends} />);

        await waitFor(() => expect(container.querySelectorAll('.friend-bar-friend')).toHaveLength(3));

        expect(container).toHaveTextContent('Staff Chat');
        expect(container).toHaveTextContent('Alice');
        expect(container).toHaveTextContent('Bruno');
        expect(container).not.toHaveTextContent('Carla');
        expect(container.querySelector('.friend-bar-find-friends')).toBeNull();

        fireEvent.click(container.querySelector<HTMLButtonElement>('.friend-bar-button.right'));

        await waitFor(() => expect(container).toHaveTextContent('Carla'));
        await waitFor(() => expect(container).not.toHaveTextContent('Staff Chat'));
    });

    it('fills the three AIR slots with find-friends entries when contacts are missing', async () => {
        const { container } = render(<FriendBarView onlineFriends={[makeFriend(-1, 'Staff Chat')]} />);

        await waitFor(() => expect(container.querySelectorAll('.friend-bar-find-friends')).toHaveLength(2));

        expect(container.querySelectorAll('.friend-bar-friend')).toHaveLength(1);
        expect(container.querySelectorAll('.friend-bar-button')).toHaveLength(0);
    });

    it('uses Frank and keeps only Chat on the Staff Chat tab', async () => {
        const { container } = render(<FriendBarView onlineFriends={[makeFriend(-1, 'Staff Chat')]} />);

        await waitFor(() => expect(container.querySelector('.friend-bar-staff-chat-frank')).not.toBeNull());
        const frank = container.querySelector('.friend-bar-staff-chat-frank');

        expect(frank).toHaveAttribute('data-size', '40');
        expect(frank?.parentElement).toHaveClass('avatar', 'staff-chat');

        fireEvent.click(container.querySelector<HTMLButtonElement>('.friend-bar-tab'));

        await waitFor(() => expect(container.querySelectorAll('.friend-bar-action-icon')).toHaveLength(1));
    });

    it('shows friend activity as AIR tokens: icon on the tab, message pieces while open, gone once closed', async () => {
        const friends = [makeFriend(1, 'Alice'), makeFriend(2, 'Bruno'), makeFriend(3, 'Carla')];
        const store = useFriendBarNotificationsStore.getState();

        store.receive(3, FriendNotificationType.PLAYING_GAME, 'snowwar');
        store.receive(3, FriendNotificationType.ROOM_EVENT, 'Disco night');

        const { container } = render(<FriendBarView onlineFriends={friends} />);

        await waitFor(() => expect(container.querySelectorAll('.friend-bar-friend')).toHaveLength(3));

        const tabs = container.querySelectorAll('.friend-bar-friend');

        expect(tabs[0]).toHaveTextContent('Carla');
        expect(tabs[0].querySelectorAll('.friend-bar-notification-icon')).toHaveLength(2);
        expect(tabs[0].querySelector('.friend-bar-notification-piece')).toBeNull();

        fireEvent.click(tabs[0].querySelector<HTMLButtonElement>('.friend-bar-tab'));

        await waitFor(() => expect(tabs[0].querySelectorAll('.friend-bar-notification-piece')).toHaveLength(2));
        expect(tabs[0]).toHaveTextContent('started an event');
        expect(tabs[0]).toHaveTextContent('Disco night');
        expect(tabs[0]).toHaveTextContent('is playing a game.');

        fireEvent.click(tabs[0].querySelector<HTMLButtonElement>('.friend-bar-tab'));

        await waitFor(() => expect(useFriendBarNotificationsStore.getState().byFriend[3]).toHaveLength(1));
        expect(useFriendBarNotificationsStore.getState().byFriend[3][0].type).toBe(FriendNotificationType.PLAYING_GAME);
    });
});
