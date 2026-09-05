/* @vitest-environment jsdom */

import { GetAvatarRenderManager } from '@octane/renderer';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessengerFriend, OpenMessengerChat } from '../../../../../api';
import { useFriends } from '../../../../../hooks';
import { FriendsListGroupItemView } from './FriendsListGroupItemView';

vi.mock('../../../../../hooks', () => ({
    useFriends: vi.fn()
}));

vi.mock('../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../api')>()),
    OpenMessengerChat: vi.fn()
}));

vi.mock('../../../../../common/layout/avatarImageCrop', () => ({
    cropTransparentImageUrl: vi.fn(async () => 'data:image/png;base64,cropped')
}));

vi.mock('../../../StaffChatFrankIconView', () => ({
    StaffChatFrankIconView: (props: { size: number }) => <div className="staff-chat-frank-icon" data-size={props.size} />
}));

describe('Friends list avatar head', () => {
    beforeEach(() => {
        vi.mocked(OpenMessengerChat).mockClear();
        vi.mocked(GetAvatarRenderManager).mockReturnValue({
            createAvatarImage: () => ({
                setDirection: vi.fn(),
                processAsImageUrl: () => 'data:image/png;base64,raw',
                isPlaceholder: () => false,
                dispose: vi.fn()
            })
        } as unknown as ReturnType<typeof GetAvatarRenderManager>);
        vi.mocked(useFriends).mockReturnValue({
            followFriend: vi.fn(),
            updateRelationship: vi.fn()
        } as unknown as ReturnType<typeof useFriends>);
    });

    afterEach(cleanup);

    it('renders the friend head as a smooth 20px compact thumbnail', () => {
        const friend = new MessengerFriend();

        friend.id = 42;
        friend.name = 'tester1';
        friend.figure = 'hd-180-1.ch-210-66.lg-270-82.sh-290-80';
        friend.gender = 0;
        friend.online = true;

        const { container } = render(<FriendsListGroupItemView friend={friend} selected={false} selectFriend={vi.fn()} />);
        const avatar = container.querySelector<HTMLElement>('.hfl-friend-avatar .avatar-image');

        expect(avatar).not.toBeNull();
        expect(avatar).toHaveClass('compact-head');
        expect(avatar).toHaveStyle({
            backgroundSize: '20px 20px',
            backgroundPosition: 'center',
            imageRendering: 'auto'
        });
    });

    it('renders the dedicated Frank face for Staff Chat', () => {
        const friend = new MessengerFriend();

        friend.id = 42;
        friend.name = 'Staff Chat';
        friend.figure = '';
        friend.gender = 0;
        friend.online = true;

        const { container } = render(<FriendsListGroupItemView friend={friend} selected={false} selectFriend={vi.fn()} />);
        const frank = container.querySelector<HTMLElement>('.hfl-friend-avatar .staff-chat-frank-icon');

        expect(frank).toHaveAttribute('data-size', '20');
        expect(container.querySelector('.hfl-friend-avatar .avatar-image')).toBeNull();
    });

    it.each([
        { id: -1, name: 'Staff Chat' },
        { id: 42, name: ' staff chat ' }
    ])('does not render Follow for a Staff Chat row identified as $id', ({ id, name }) => {
        const friend = new MessengerFriend();

        friend.id = id;
        friend.name = name;
        friend.figure = 'hd-180-1.ch-210-66.lg-270-82.sh-290-80';
        friend.gender = 0;
        friend.online = true;

        const { container } = render(<FriendsListGroupItemView friend={friend} selected={false} selectFriend={vi.fn()} />);

        expect(container.querySelector('.hfl-action.follow')).toBeNull();
        expect(container.querySelector('.hfl-action.chat')).not.toBeNull();
    });

    it('keeps the profile layout slot empty for Staff Chat', () => {
        const friend = new MessengerFriend();

        friend.id = 42;
        friend.name = 'Staff Chat';
        friend.online = true;

        const { container } = render(<FriendsListGroupItemView friend={friend} selected={false} selectFriend={vi.fn()} />);

        const profileSlot = container.querySelector('.hfl-friend-profile');

        expect(profileSlot).not.toBeNull();
        expect(profileSlot).toBeEmptyDOMElement();
        expect(container.querySelector('.hfl-action.chat')).not.toBeNull();
    });

    it('opens an online friend conversation on row double click', () => {
        const friend = new MessengerFriend();

        friend.id = 42;
        friend.name = 'Lorenzo';
        friend.online = true;

        const { container } = render(<FriendsListGroupItemView friend={friend} selected={false} selectFriend={vi.fn()} />);

        fireEvent.doubleClick(container.querySelector('.hfl-friend'));

        expect(OpenMessengerChat).toHaveBeenCalledOnce();
        expect(OpenMessengerChat).toHaveBeenCalledWith(42);
    });
});
