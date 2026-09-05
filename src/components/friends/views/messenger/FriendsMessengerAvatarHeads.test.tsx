/* @vitest-environment jsdom */

import { AddLinkEventTracker, GetAvatarRenderManager, GetSessionDataManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessengerFriend, MessengerThread } from '../../../../api';
import { useFriends, useHelp, useMessenger, useTranslation } from '../../../../hooks';
import { FriendsMessengerView } from './FriendsMessengerView';
import { FriendsMessengerThreadGroup } from './messenger-thread/FriendsMessengerThreadGroup';

vi.mock('../../../../hooks', () => ({
    useFriends: vi.fn(),
    useHelp: vi.fn(),
    useMessenger: vi.fn(),
    useTranslation: vi.fn()
}));

vi.mock('../../../../common/layout/avatarImageCrop', () => ({
    cropTransparentImageUrl: vi.fn(async () => 'data:image/png;base64,cropped')
}));

vi.mock('../../StaffChatFrankIconView', () => ({
    StaffChatFrankIconView: (props: { className?: string; size: number }) => (
        <div className={`staff-chat-frank-icon ${props.className || ''}`.trim()} data-size={props.size} />
    )
}));

const figure = 'hd-180-1.ch-210-66.lg-270-82.sh-290-80';

const makeFriend = (id = 42, name = 'Lorenzo') => {
    const friend = new MessengerFriend();

    friend.id = id;
    friend.name = name;
    friend.gender = 0;
    friend.figure = figure;
    friend.online = true;

    return friend;
};

const makeThread = (friend: MessengerFriend) => {
    const thread = new MessengerThread(friend);

    thread.addMessage(friend.id, 'Ciao');

    return thread;
};

describe('Messenger avatar heads', () => {
    const friend = makeFriend();

    beforeEach(() => {
        vi.mocked(AddLinkEventTracker).mockClear();
        vi.mocked(GetAvatarRenderManager).mockReturnValue({
            createAvatarImage: () => ({
                setDirection: vi.fn(),
                processAsImageUrl: () => 'data:image/png;base64,raw',
                isPlaceholder: () => false,
                dispose: vi.fn()
            })
        } as unknown as ReturnType<typeof GetAvatarRenderManager>);
        vi.mocked(GetSessionDataManager).mockReturnValue({
            userId: 7,
            userName: 'Simoleo',
            figure
        } as ReturnType<typeof GetSessionDataManager>);
        vi.mocked(useFriends).mockReturnValue({ getFriend: () => friend } as unknown as ReturnType<typeof useFriends>);
        vi.mocked(useHelp).mockReturnValue({ report: vi.fn() } as unknown as ReturnType<typeof useHelp>);
        vi.mocked(useTranslation).mockReturnValue({
            settings: { enabled: false },
            translateOutgoing: vi.fn()
        } as unknown as ReturnType<typeof useTranslation>);
    });

    afterEach(cleanup);

    it('uses a tightly cropped head in each conversation tab', () => {
        const thread = makeThread(friend);

        vi.mocked(useMessenger).mockReturnValue({
            visibleThreads: [thread],
            activeThread: null,
            getMessageThread: () => thread,
            sendMessage: vi.fn(),
            setActiveThreadId: vi.fn(),
            closeThread: vi.fn(),
            typingUserIds: [],
            sendTypingStatus: vi.fn()
        } as unknown as ReturnType<typeof useMessenger>);

        render(<FriendsMessengerView />);

        const tracker = vi.mocked(AddLinkEventTracker).mock.calls[0][0];

        act(() => tracker.linkReceived('friends-messenger/open'));

        const avatar = document.querySelector<HTMLElement>('.messenger-avatar-tab .avatar-image');

        expect(avatar).not.toBeNull();
        expect(avatar).toHaveClass('compact-head');
        expect(avatar).toHaveStyle({ backgroundSize: '35px 35px', backgroundPosition: 'center' });
    });

    it('uses the AIR avatar crop on the right side of incoming messages', () => {
        const thread = makeThread(friend);
        const { container } = render(<FriendsMessengerThreadGroup thread={thread} group={thread.groups[0]} />);
        const avatar = container.querySelector<HTMLElement>('.message-avatar .avatar-image');
        const row = container.querySelector<HTMLElement>('.messenger-message-row');

        expect(avatar).not.toBeNull();
        expect(avatar).not.toHaveClass('compact-head');
        expect(row.lastElementChild).toHaveClass('message-avatar');
    });

    it('uses the AIR avatar crop on the left side of sent messages', () => {
        const thread = new MessengerThread(friend);

        thread.addMessage(7, 'Ciao Lorenzo');

        const { container } = render(<FriendsMessengerThreadGroup thread={thread} group={thread.groups[0]} />);
        const avatar = container.querySelector<HTMLElement>('.messenger-message-row.own .message-avatar .avatar-image');
        const row = container.querySelector<HTMLElement>('.messenger-message-row.own');

        expect(avatar).not.toBeNull();
        expect(avatar).not.toHaveClass('compact-head');
        expect(row.firstElementChild).toHaveClass('message-avatar');
    });

    it('uses the seven-avatar viewport with working overflow controls', async () => {
        const friends = Array.from({ length: 8 }, (_, index) => makeFriend(index + 1, `Friend ${index + 1}`));
        const threads = friends.map(makeThread);

        vi.mocked(useFriends).mockReturnValue({ getFriend: (id: number) => friends.find((entry) => entry.id === id) } as unknown as ReturnType<
            typeof useFriends
        >);
        vi.mocked(useMessenger).mockReturnValue({
            visibleThreads: threads,
            activeThread: threads[0],
            getMessageThread: (id: number) => threads.find((thread) => thread.participant.id === id),
            sendMessage: vi.fn(),
            setActiveThreadId: vi.fn(),
            closeThread: vi.fn(),
            typingUserIds: [],
            sendTypingStatus: vi.fn()
        } as unknown as ReturnType<typeof useMessenger>);

        render(<FriendsMessengerView />);

        const tracker = vi.mocked(AddLinkEventTracker).mock.calls[0][0];
        act(() => tracker.linkReceived('friends-messenger/open'));

        expect(document.querySelector('.messenger-window')).not.toBeNull();
        expect(document.querySelectorAll('.messenger-avatar-tab')).toHaveLength(7);
        expect(document.querySelector<HTMLButtonElement>('[data-action="scroll-left"]')).toBeDisabled();
        expect(document.querySelector<HTMLButtonElement>('[data-action="scroll-right"]')).not.toBeDisabled();

        fireEvent.click(document.querySelector<HTMLButtonElement>('[data-action="scroll-right"]'));

        await waitFor(() => expect(document.querySelector('[data-participant-id="8"]')).not.toBeNull());
        expect(document.querySelector('[data-participant-id="1"]')).toBeNull();
    });

    it('renders the dedicated Frank face and no user actions for Staff Chat', () => {
        const staff = makeFriend(-1, 'Staff Chat');
        staff.figure = 'ADM';
        const thread = makeThread(staff);

        vi.mocked(useFriends).mockReturnValue({ getFriend: () => staff } as unknown as ReturnType<typeof useFriends>);
        vi.mocked(useMessenger).mockReturnValue({
            visibleThreads: [thread],
            activeThread: thread,
            getMessageThread: () => thread,
            sendMessage: vi.fn(),
            setActiveThreadId: vi.fn(),
            closeThread: vi.fn(),
            typingUserIds: [],
            sendTypingStatus: vi.fn()
        } as unknown as ReturnType<typeof useMessenger>);

        render(<FriendsMessengerView />);

        const tracker = vi.mocked(AddLinkEventTracker).mock.calls[0][0];
        act(() => tracker.linkReceived('friends-messenger/open'));

        expect(document.querySelector('.messenger-avatar-tab .staff-chat-frank-icon.staff-chat-frank')).toHaveAttribute('data-size', '35');
        expect(document.querySelector('.messenger-avatar-tab .avatar-image')).toBeNull();
        expect(document.querySelector('.messenger-actions .follow')).toBeNull();
        expect(document.querySelector('.messenger-actions .profile')).toBeNull();
        expect(document.querySelector('.messenger-actions .danger')).toBeNull();
        expect(document.querySelector('.messenger-actions .close-btn')).not.toBeNull();
    });
});
