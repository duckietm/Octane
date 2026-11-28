/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';

const mocks = vi.hoisted(() => ({
    sent: [] as { name: string; args: unknown[] }[],
    handlers: new Map<unknown, Set<(event: unknown) => void>>(),
    trackers: [] as { linkReceived: (url: string) => void; eventUrlPrefix: string }[],
    links: [] as string[],
    groupInfo: [] as number[],
    profiles: [] as number[],
    reports: [] as unknown[][],
    now: 100000
}));

vi.mock('@octane/renderer', () => {
    const composer = (name: string) =>
        class {
            public name = name;
            public args: unknown[];

            constructor(...args: unknown[]) {
                this.args = args;
            }
        };
    const event = () => class {};

    return {
        AddLinkEventTracker: (tracker: (typeof mocks.trackers)[number]) => mocks.trackers.push(tracker),
        RemoveLinkEventTracker: (tracker: (typeof mocks.trackers)[number]) => mocks.trackers.splice(mocks.trackers.indexOf(tracker), 1),
        CreateLinkEvent: (link: string) => mocks.links.push(link),
        ForumDataMessageEvent: event(),
        ForumsListMessageEvent: event(),
        UnreadForumsCountMessageEvent: event(),
        UpdateThreadMessageEvent: event(),
        GuildForumThreadsEvent: event(),
        ThreadMessagesMessageEvent: event(),
        PostMessageMessageEvent: event(),
        PostThreadMessageEvent: event(),
        UpdateMessageMessageEvent: event(),
        GetForumsListMessageComposer: composer('GetForumsList'),
        GetForumStatsMessageComposer: composer('GetForumStats'),
        GetThreadMessageComposer: composer('GetThread'),
        GetThreadsMessageComposer: composer('GetThreads'),
        GetMessagesMessageComposer: composer('GetMessages'),
        GetUnreadForumsCountMessageComposer: composer('GetUnreadForumsCount'),
        UpdateForumReadMarkerMessageComposer: composer('UpdateForumReadMarker'),
        UpdateForumReadMarkerEntry: composer('ReadMarkerEntry'),
        UpdateThreadMessageComposer: composer('UpdateThread'),
        ModerateThreadMessageComposer: composer('ModerateThread'),
        ModerateMessageMessageComposer: composer('ModerateMessage'),
        PostMessageMessageComposer: composer('PostMessage'),
        UpdateForumSettingsMessageComposer: composer('UpdateForumSettings')
    };
});

// A text is its key, followed by what fills it: "groupforum.view.thread_details1(12)".
const localize = (key: string, _parameters: string[] = null, values: string[] = null) => (values?.length ? `${key}(${[...new Set(values)].join(',')})` : key);

vi.mock('../../../../api', () => ({
    CreateLinkEvent: (link: string) => mocks.links.push(link),
    FriendlyTime: { format: (seconds: number) => `${Math.round(seconds)}s` },
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    GetGroupInformation: (groupId: number) => mocks.groupInfo.push(groupId),
    GetUserProfile: (userId: number) => mocks.profiles.push(userId),
    LocalizeText: (key: string, parameters?: string[], values?: string[]) => localize(key, parameters, values),
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    ReportType: { THREAD: 'thread', MESSAGE: 'message' },
    SendMessageComposer: (composer: { name: string; args: unknown[] }) => mocks.sent.push({ name: composer.name, args: composer.args })
}));
vi.mock('../../../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../../../hooks', async () => {
    const { useEffect, useRef } = await import('react');

    return {
        useHelp: () => ({ report: (...args: unknown[]) => mocks.reports.push(args) }),
        useNotification: () => ({ simpleAlert: vi.fn() }),
        // The newest handler of every mounted view, by event class.
        useMessageEvent: (type: unknown, handler: (event: unknown) => void) => {
            const latest = useRef(handler);

            latest.current = handler;

            useEffect(() => {
                const listener = (event: unknown) => latest.current(event);
                const bucket = mocks.handlers.get(type) ?? new Set();

                bucket.add(listener);
                mocks.handlers.set(type, bucket);

                return () => {
                    bucket.delete(listener);
                };
            }, [type]);
        }
    };
});

vi.mock('../../../../common', () => ({
    ClassicScrollAreaView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DraggableWindowPosition: { TOP_LEFT: 'top_left', CENTER: 'center' },
    LayoutAvatarImageView: ({ figure }: { figure: string }) => <i data-figure={figure} />,
    LayoutBadgeImageView: ({ badgeCode }: { badgeCode: string }) => <i data-badge={badgeCode} />,
    OctaneCardHeaderView: ({ children, onCloseClick }: { children: ReactNode; onCloseClick: () => void }) => (
        <div>
            {children}
            <button data-testid="desktop-close" onClick={onCloseClick} />
        </div>
    ),
    OctaneCardView: ({ children, className }: { children: ReactNode; className: string }) => (
        <div className={className} data-testid="desktop-window">
            {children}
        </div>
    )
}));
vi.mock('../../../../common/Tooltip', () => ({ Hint: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));
// The desktop windows draw their labels at fixed coordinates; here a label is its text.
vi.mock('../GroupNativeLayout', () => ({
    flatText: () => ({}),
    GroupInput: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
        <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
    ),
    GroupText: ({ text, onClick }: { text: string; onClick?: () => void }) => <span onClick={onClick}>{text}</span>,
    GroupWindowTitle: ({ title }: { title: string }) => <span>{title}</span>
}));

import * as renderer from '@octane/renderer';
import { GroupForumView } from './GroupForumView';
import { handheldForumPanes } from './HandheldGroupForumView';

const GROUP = 7;

const forum = (groupId: number, name: string, unreadMessages = 0) => ({
    groupId,
    name,
    icon: `badge-${groupId}`,
    unreadMessages,
    totalMessages: 40 + groupId,
    leaderboardScore: 3,
    lastMessageAuthorName: 'Alba',
    lastMessageTimeAsSecondsAgo: 90,
    lastReadMessageId: 0,
    updateFrom: vi.fn(),
    addNewThread: vi.fn()
});

const forumData = (rights: Record<string, unknown> = {}) => ({
    groupId: GROUP,
    name: 'Builders',
    description: 'Rooms and wired',
    icon: 'badge-7',
    readPermissionError: '',
    lastReadMessageId: 0,
    totalMessages: 47,
    totalThreads: 3,
    readPermissions: 0,
    postMessagePermissions: 0,
    postThreadPermissions: 0,
    moderatePermissions: 2,
    canChangeSettings: false,
    canModerate: false,
    isStaff: false,
    canReport: false,
    canPostThread: true,
    canPostMessage: true,
    postThreadPermissionError: '',
    postMessagePermissionError: '',
    moderatePermissionError: '',
    ...rights
});

const thread = (threadId: number, header: string, extra: Record<string, unknown> = {}) => ({
    threadId,
    header,
    authorName: 'Alba',
    creationTimeAsSecondsAgo: 600,
    lastUserName: 'Bram',
    lastCommentTime: 60,
    totalMessages: 4,
    unreadMessagesCount: 0,
    lastMessageId: threadId * 100 + 3,
    state: 1,
    adminName: 'Mod',
    isLocked: false,
    isPinned: false,
    ...extra
});

const message = (messageId: number, messageIndex: number, messageText: string, extra: Record<string, unknown> = {}) => ({
    messageId,
    messageIndex,
    threadId: 11,
    authorId: 500 + messageIndex,
    authorName: `Author${messageIndex}`,
    authorFigure: 'hd-180-1',
    authorPostCount: 12,
    creationTime: 120,
    messageText,
    state: 1,
    adminName: 'Mod',
    ...extra
});

const THREADS = [
    thread(11, 'Wired doors', { isPinned: true, unreadMessagesCount: 2 }),
    thread(12, 'Trading rules', { isLocked: true }),
    thread(13, 'Old thread', { state: 10 })
];
const MESSAGES = [message(1101, 0, 'First line\n> quoted line\nAnswer'), message(1102, 1, 'Second message'), message(1103, 2, 'Hidden text', { state: 10 })];

const emit = (type: unknown, parser: unknown) => act(() => mocks.handlers.get(type)?.forEach((handler) => handler({ getParser: () => parser })));
const link = (url: string) => act(() => mocks.trackers.forEach((tracker) => tracker.linkReceived(url)));
const sentOf = (name: string) => mocks.sent.filter((entry) => entry.name === name).map((entry) => entry.args);
const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));
const pane = (name: string) => document.querySelector<HTMLElement>(`.octane-handheld-forum__pane[data-pane="${name}"]`);

/** Opens the forum window on "My Forums" with two forums listed. */
const openList = () => {
    render(<GroupForumView />);
    link('groupforum/toggle');
    emit(renderer.ForumsListMessageEvent, { listCode: 2, totalAmount: 45, startIndex: 0, forums: [forum(GROUP, 'Builders', 5), forum(8, 'Traders')] });
};

/** From the list into the forum of the group, its threads loaded. */
const openForum = (rights: Record<string, unknown> = {}) => {
    openList();
    fireEvent.click(within(screen.getByTestId(`forum-${GROUP}`)).getByText('Builders'));
    emit(renderer.ForumDataMessageEvent, { extendedForumData: forumData(rights) });
    emit(renderer.GuildForumThreadsEvent, { groupId: GROUP, startIndex: 0, threads: THREADS });
};

/** From the thread list into the first thread, its messages loaded. */
const openThread = (rights: Record<string, unknown> = {}) => {
    openForum(rights);
    fireEvent.click(within(screen.getByTestId('thread-11')).getByText('Wired doors'));
    emit(renderer.ThreadMessagesMessageEvent, { groupId: GROUP, threadId: 11, startIndex: 0, messages: MESSAGES });
};

beforeEach(() => {
    mocks.sent.length = 0;
    mocks.links.length = 0;
    mocks.groupInfo.length = 0;
    mocks.profiles.length = 0;
    mocks.reports.length = 0;
    // Every test starts past the cooldown of the post before it.
    mocks.now += 120000;
    vi.spyOn(performance, 'now').mockImplementation(() => mocks.now);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('the group forums on a phone', () => {
    it('are one full-screen sheet whose tabs are the three forum lists', () => {
        phone();
        openList();

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(screen.queryByTestId('desktop-window')).toBeNull();
        expect(document.querySelector('.octane-handheld-sheet.octane-handheld-forum')).toBeTruthy();

        const tabs = screen.getAllByRole('tab');

        expect(tabs.map((tab) => tab.querySelector('.octane-handheld-sheet__tab-label').textContent)).toEqual([
            'groupforum.view.shortcuts.my',
            'groupforum.view.shortcuts.active',
            'groupforum.view.shortcuts.popular'
        ]);
        expect(tabs[0].className).toContain('is-active');
        // The forums with unread messages are counted on "mine".
        expect(tabs[0].querySelector('.octane-handheld-sheet__tab-count').textContent).toBe('1');
        expect(screen.getByTestId('forum-heading').textContent).toContain('groupforum.view.forums_header.2');

        fireEvent.click(tabs[1]);

        expect(sentOf('GetForumsList').at(-1)).toEqual([0, 0, 20]);

        fireEvent.click(screen.getByLabelText('help.button.tooltip'));

        expect(mocks.links).toContain('habbopages/forums');
    });

    it('lists the forums with their counts, pages and the way to mark them read', () => {
        phone();
        openList();

        const row = screen.getByTestId(`forum-${GROUP}`);

        expect(row.dataset.unread).toBe('true');
        expect(row.textContent).toContain('groupforum.view.forum_details(3,Alba,90s)');
        expect(row.textContent).toContain('groupforum.view.thread_details1(47)');
        expect(row.textContent).toContain('groupforum.view.thread_details2(5)');
        expect(screen.getByTestId('forum-8').dataset.unread).toBe('false');

        // The badge opens the group, as on the desktop.
        fireEvent.click(row.querySelector('.octane-handheld-forum__row-badge'));

        expect(mocks.groupInfo).toEqual([GROUP]);

        // 45 forums are three pages; the first has nowhere to go back to.
        expect(screen.getByText('1 / 3')).toBeTruthy();
        expect(screen.getByLabelText('Previous page')).toBeDisabled();

        fireEvent.click(screen.getByLabelText('Next page'));

        expect(sentOf('GetForumsList').at(-1)).toEqual([2, 20, 20]);

        fireEvent.click(screen.getByText('groupforum.view.mark_read'));

        // Every forum with unread messages is marked read as a whole, then the window closes.
        expect(sentOf('UpdateForumReadMarker')).toHaveLength(1);
        expect(screen.queryByTestId('window')).toBeNull();
    });

    it('goes from the list to the threads to a thread and back', () => {
        phone();
        openList();

        fireEvent.click(within(screen.getByTestId(`forum-${GROUP}`)).getByText('Builders'));

        expect(sentOf('GetForumStats')).toEqual([[GROUP]]);

        emit(renderer.ForumDataMessageEvent, { extendedForumData: forumData() });

        expect(screen.queryByTestId('forum-list')).toBeNull();
        expect(screen.getByTestId('forum-heading').textContent).toContain('Builders');
        expect(sentOf('GetThreads')).toEqual([[GROUP, 0, 20]]);

        emit(renderer.GuildForumThreadsEvent, { groupId: GROUP, startIndex: 0, threads: THREADS });

        const first = screen.getByTestId('thread-11');

        expect(first.dataset.unread).toBe('true');
        expect(within(first).getByLabelText('Pinned')).toBeTruthy();
        expect(within(screen.getByTestId('thread-12')).getByLabelText('Locked')).toBeTruthy();
        // A hidden thread reads as the notice for who may not moderate.
        expect(screen.getByTestId('thread-13').dataset.state).toBe('hidden');
        expect(screen.getByTestId('thread-13').textContent).toContain('groupforum.view.thread_hidden_by_admin(Mod)');
        expect(screen.getByTestId('thread-13').textContent).not.toContain('Old thread');

        fireEvent.click(within(first).getByText('Wired doors'));

        // Upright the thread replaces the thread list; it opens at the first unread message's page.
        expect(screen.queryByTestId('forum-threads')).toBeNull();
        expect(sentOf('GetMessages')).toEqual([[GROUP, 11, 0, 20]]);

        emit(renderer.ThreadMessagesMessageEvent, { groupId: GROUP, threadId: 11, startIndex: 0, messages: MESSAGES });

        const page = screen.getByTestId('forum-thread');

        expect(page.querySelector('.octane-handheld-forum__subject').textContent).toBe('Wired doors');
        expect(page.querySelectorAll('.octane-handheld-forum__message')).toHaveLength(3);

        const card = screen.getByTestId('message-1101');

        expect(card.textContent).toContain('#1');
        expect(card.textContent).toContain('120s');
        // The quoted line is set apart, without its marker.
        expect(card.querySelector('.octane-handheld-forum__quote').textContent).toBe('quoted line');
        expect([...card.querySelectorAll('.octane-handheld-forum__lines')].map((lines) => lines.textContent)).toEqual(['First line', 'Answer']);

        // The author's head and name open the profile.
        fireEvent.click(within(card).getByText('Author0'));
        fireEvent.click(card.querySelector('.octane-handheld-forum__avatar'));

        expect(mocks.profiles).toEqual([500, 500]);

        fireEvent.click(screen.getByTestId('forum-back'));

        expect(screen.queryByTestId('forum-thread')).toBeNull();
        expect(screen.getByTestId('forum-threads')).toBeTruthy();

        mocks.sent.length = 0;
        fireEvent.click(screen.getByTestId('forum-leave'));

        // Leaving marks the forum read and asks for the list it was opened from.
        expect(sentOf('UpdateForumReadMarker')).toHaveLength(1);
        expect(sentOf('GetForumsList')).toEqual([[2, 0, 20]]);
    });

    it('shows a hidden message as its notice to who may not moderate, and with its text to a moderator', () => {
        phone();
        openThread();

        // A message not read yet is drawn as new, whatever its state (the desktop rule); once refreshed it is drawn in its own.
        expect(screen.getByTestId('message-1103').dataset.look).toBe('new');
        emit(renderer.UpdateMessageMessageEvent, { groupId: GROUP, threadId: 11, message: MESSAGES[2] });

        const hidden = screen.getByTestId('message-1103');

        expect(hidden.dataset.look).toBe('hidden');
        expect(hidden.textContent).toContain('groupforum.view.message_hidden_by_admin(Mod)');
        expect(hidden.textContent).not.toContain('Hidden text');
        cleanup();

        openThread({ canModerate: true });
        emit(renderer.UpdateMessageMessageEvent, { groupId: GROUP, threadId: 11, message: MESSAGES[2] });

        const moderated = screen.getByTestId('message-1103');

        expect(moderated.dataset.look).toBe('hidden');
        expect(moderated.textContent).toContain('groupforum.view.message_hidden_by_admin(Mod)');
        expect(moderated.textContent).toContain('Hidden text');
    });

    it('writes a new thread with the rules and the packet of the desktop composer', () => {
        phone();
        openForum();

        fireEvent.click(screen.getByTestId('forum-new-thread'));

        const compose = screen.getByTestId('forum-compose');
        const post = screen.getByTestId('forum-compose-post');
        const subject = within(compose).getByLabelText('groupforum.compose.subject') as HTMLInputElement;
        const text = within(compose).getByLabelText('groupforum.compose.message') as HTMLTextAreaElement;

        // Upright the composer is a page of its own; the thread list stays mounted behind it.
        expect(pane('threads').hidden).toBe(true);
        expect(pane('compose').hidden).toBe(false);
        expect(subject.maxLength).toBe(120);
        expect(text.maxLength).toBe(4000);
        expect(post).toBeDisabled();
        expect(compose.textContent).toContain('groupforum.compose.subject_too_short');

        fireEvent.change(subject, { target: { value: 'A long enough subject' } });
        fireEvent.change(text, { target: { value: 'too short' } });

        expect(post).toBeDisabled();
        expect(compose.textContent).toContain('groupforum.compose.message_too_short');

        fireEvent.change(text, { target: { value: 'A message that is\nlong enough' } });

        expect(post).not.toBeDisabled();

        fireEvent.click(post);
        fireEvent.click(post);

        expect(sentOf('PostMessage')).toEqual([[GROUP, 0, 'A long enough subject', 'A message that is\rlong enough']]);

        // The server's answer closes the composer and shows the first page of the threads again.
        emit(renderer.PostThreadMessageEvent, { groupId: GROUP, thread: thread(14, 'A long enough subject') });

        expect(screen.queryByTestId('forum-compose')).toBeNull();
        expect(pane('threads').hidden).toBe(false);

        fireEvent.click(screen.getByTestId('forum-new-thread'));
        fireEvent.click(screen.getByTestId('forum-compose-cancel'));

        expect(screen.queryByTestId('forum-compose')).toBeNull();
    });

    it('replies to a thread, and quotes a message into the reply', () => {
        phone();
        openThread();

        fireEvent.click(within(screen.getByTestId('message-1102')).getByText('Quote'));

        const compose = screen.getByTestId('forum-compose');
        const text = within(compose).getByLabelText('groupforum.compose.message') as HTMLTextAreaElement;

        // The subject of the thread is shown, not typed; the thread stays mounted behind the page.
        expect(compose.querySelector('.octane-handheld-forum__reply-subject').textContent).toBe('Wired doors');
        expect(within(compose).queryByLabelText('groupforum.compose.subject_replying_to')).toBeNull();
        expect(pane('thread').hidden).toBe(true);
        expect(text.value).toBe('groupforum.compose.reply_template(120s,Author1)\n> Second message\n\n');

        fireEvent.change(text, { target: { value: `${text.value}I agree with this` } });
        fireEvent.click(screen.getByTestId('forum-compose-post'));

        expect(sentOf('PostMessage')).toEqual([[GROUP, 11, '', 'groupforum.compose.reply_template(120s,Author1)\r> Second message\r\rI agree with this']]);

        emit(renderer.PostMessageMessageEvent, { groupId: GROUP, threadId: 11, message: message(1104, 3, 'I agree with this') });

        expect(screen.queryByTestId('forum-compose')).toBeNull();
        expect(pane('thread').hidden).toBe(false);

        // The plain Reply of the bar opens an empty reply.
        mocks.now += 120000;
        fireEvent.click(screen.getByTestId('forum-reply'));

        expect((within(screen.getByTestId('forum-compose')).getByLabelText('groupforum.compose.message') as HTMLTextAreaElement).value).toBe('');
    });

    it('offers the settings to who may change them, and saves the four levels', () => {
        phone();
        openForum({ canChangeSettings: true });

        fireEvent.click(screen.getByTestId('forum-settings'));

        const settings = screen.getByTestId('forum-settings-page');
        const radio = (name: string) => within(settings).getByRole('radio', { name });

        expect(pane('threads').hidden).toBe(true);
        expect(settings.querySelectorAll('.octane-handheld-forum__section')).toHaveLength(4);
        expect(within(settings).getAllByRole('radio')).toHaveLength(13);
        expect(radio('groupforum.permissions.read_label groupforum.permissions.option_all').getAttribute('aria-checked')).toBe('true');

        // Reading for members only: posting and starting threads follow, and "everybody" can no longer be picked there.
        fireEvent.click(radio('groupforum.permissions.read_label groupforum.permissions.option_group_members'));

        expect(radio('groupforum.permissions.post_message_label groupforum.permissions.option_group_members').getAttribute('aria-checked')).toBe('true');
        expect(radio('groupforum.permissions.post_message_label groupforum.permissions.option_all').getAttribute('aria-disabled')).toBe('true');

        fireEvent.click(radio('groupforum.permissions.moderate_label groupforum.permissions.option_owner'));
        fireEvent.click(screen.getByTestId('forum-settings-save'));

        expect(sentOf('UpdateForumSettings')).toEqual([[GROUP, 1, 1, 1, 3]]);
        expect(screen.queryByTestId('forum-settings-page')).toBeNull();
        expect(pane('threads').hidden).toBe(false);

        // Cancel sends nothing.
        fireEvent.click(screen.getByTestId('forum-settings'));
        fireEvent.click(screen.getByTestId('forum-settings-cancel'));

        expect(sentOf('UpdateForumSettings')).toHaveLength(1);
    });

    it('hides what needs a right from who does not have it', () => {
        phone();
        openThread({ canPostMessage: false, canPostThread: false, postMessagePermissionError: 'not_member' });

        // No settings, no hiding, no reporting; quoting and replying are off, with the reason.
        expect(screen.queryByTestId('forum-settings')).toBeNull();
        expect(document.querySelector('[data-action="hide"], [data-action="unhide"], [data-action="report"]')).toBeNull();
        expect(within(screen.getByTestId('message-1101')).getByText('Quote').closest('button')).toBeDisabled();
        expect(screen.getByTestId('forum-reply')).toBeDisabled();
        expect(screen.getByTestId('forum-thread').textContent).toContain('groupforum.view.error.not_member');

        fireEvent.click(screen.getByTestId('forum-back'));

        // The thread list has no action buttons either, and no new thread.
        expect(document.querySelector('.octane-handheld-forum__row-more')).toBeNull();
        expect(screen.getByTestId('forum-new-thread')).toBeDisabled();
    });

    it('gives a moderator the lock, pin, hide and report of the desktop, with the same packets', () => {
        phone();
        openForum({ canModerate: true, canReport: true });

        const row = screen.getByTestId('thread-12');

        expect(row.querySelector('.octane-handheld-forum__actions')).toBeNull();

        fireEvent.click(within(row).getByLabelText('Thread actions'));
        // The thread is locked and not pinned.
        fireEvent.click(within(row).getByText('Unlock'));
        fireEvent.click(within(row).getByText('Pin'));
        fireEvent.click(within(row).getByText('Hide'));
        fireEvent.click(within(row).getByText('Report'));

        expect(sentOf('UpdateThread')).toEqual([
            [GROUP, 12, false, false],
            [GROUP, 12, true, true]
        ]);
        expect(sentOf('ModerateThread')).toEqual([[GROUP, 12, 10]]);
        expect(mocks.reports).toEqual([['thread', { groupId: GROUP, threadId: 12 }]]);

        // A thread hidden by an administrator can be shown again; its subject stays readable to the moderator.
        const hidden = screen.getByTestId('thread-13');

        expect(hidden.textContent).toContain('Old thread');
        fireEvent.click(within(hidden).getByLabelText('Thread actions'));
        fireEvent.click(within(hidden).getByText('Show again'));

        expect(sentOf('ModerateThread').at(-1)).toEqual([GROUP, 13, 1]);

        fireEvent.click(within(screen.getByTestId('thread-11')).getByText('Wired doors'));
        emit(renderer.ThreadMessagesMessageEvent, { groupId: GROUP, threadId: 11, startIndex: 0, messages: MESSAGES });

        const card = screen.getByTestId('message-1102');

        fireEvent.click(within(card).getByText('Hide'));
        fireEvent.click(within(card).getByText('Report'));

        expect(sentOf('ModerateMessage')).toEqual([[GROUP, 11, 1102, 10]]);
        expect(mocks.reports.at(-1)).toEqual(['message', { groupId: GROUP, threadId: 11, messageId: 1102 }]);
    });

    it('shows the thread beside its thread list when the phone is on its side', () => {
        phone('landscape');
        openThread();

        expect(document.querySelector('.octane-handheld-forum__layout').getAttribute('data-columns')).toBe('2');
        expect(pane('threads').hidden).toBe(false);
        expect(pane('thread').hidden).toBe(false);
        expect(screen.getByTestId('thread-11').dataset.active).toBe('true');

        // Writing a reply takes the place of the list; the thread stays beside it.
        fireEvent.click(screen.getByTestId('forum-reply'));

        expect(pane('threads').hidden).toBe(true);
        expect(pane('thread').hidden).toBe(false);
        expect(pane('compose').hidden).toBe(false);

        fireEvent.click(screen.getByTestId('forum-compose-cancel'));

        // Another thread picked in the list replaces the one shown; a locked one takes no reply from who may not moderate.
        fireEvent.click(within(screen.getByTestId('thread-12')).getByText('Trading rules'));

        expect(sentOf('GetMessages').at(-1)).toEqual([GROUP, 12, 0, 20]);
        expect(screen.getByTestId('thread-12').dataset.active).toBe('true');
        expect(screen.getByTestId('forum-thread').querySelectorAll('.octane-handheld-forum__message')).toHaveLength(0);
        expect(screen.getByTestId('forum-reply')).toBeDisabled();
    });

    it('closes from the header and forgets the open forum', () => {
        phone();
        openForum();

        fireEvent.click(screen.getByLabelText('generic.close'));

        expect(screen.queryByTestId('window')).toBeNull();
    });
});

describe('handheldForumPanes', () => {
    const mounted = (...names: string[]) => ({
        list: false,
        threads: false,
        thread: false,
        compose: false,
        settings: false,
        ...Object.fromEntries(names.map((name) => [name, true]))
    });

    it('shows one page upright: the settings over the composer over the thread over the list', () => {
        expect(handheldForumPanes('portrait', mounted('list'))).toEqual(['list']);
        expect(handheldForumPanes('portrait', mounted('threads'))).toEqual(['threads']);
        expect(handheldForumPanes('portrait', mounted('thread'))).toEqual(['thread']);
        expect(handheldForumPanes('portrait', mounted('thread', 'compose'))).toEqual(['compose']);
        expect(handheldForumPanes('portrait', mounted('threads', 'compose', 'settings'))).toEqual(['settings']);
    });

    it('shows two beside each other on its side', () => {
        expect(handheldForumPanes('landscape', mounted('list'))).toEqual(['list']);
        expect(handheldForumPanes('landscape', mounted('threads'))).toEqual(['threads']);
        expect(handheldForumPanes('landscape', mounted('threads', 'thread'))).toEqual(['threads', 'thread']);
        expect(handheldForumPanes('landscape', mounted('threads', 'compose'))).toEqual(['threads', 'compose']);
        expect(handheldForumPanes('landscape', mounted('threads', 'thread', 'compose'))).toEqual(['thread', 'compose']);
        expect(handheldForumPanes('landscape', mounted('threads', 'thread', 'settings'))).toEqual(['thread', 'settings']);
    });
});

describe('the group forums on the desktop', () => {
    it('stay the AIR windows: no sheet, the native rows, the composer and the settings as windows of their own', () => {
        openList();
        fireEvent.click(document.querySelector('.octane-forum__forum-header'));
        emit(renderer.ForumDataMessageEvent, { extendedForumData: forumData({ canChangeSettings: true }) });
        emit(renderer.GuildForumThreadsEvent, { groupId: GROUP, startIndex: 0, threads: THREADS });

        expect(screen.queryByTestId('window')).toBeNull();
        expect(document.querySelector('.octane-handheld-forum')).toBeNull();
        expect(document.querySelector('[class*="octane-handheld-forum__"]')).toBeNull();
        expect(document.querySelectorAll('.octane-forum.octane-group-forum')).toHaveLength(1);
        expect(document.querySelectorAll('.octane-forum__thread')).toHaveLength(3);
        expect(document.querySelector('.octane-forum__shortcuts')).toBeTruthy();
        expect(document.querySelector('.octane-forum__pager')).toBeTruthy();

        fireEvent.click(document.querySelector('.octane-forum__settings'));
        fireEvent.click(screen.getByText('groupforum.view.start_thread'));

        expect(document.querySelectorAll('.octane-forum.octane-group-forum-settings')).toHaveLength(1);
        expect(document.querySelectorAll('.octane-forum.octane-group-forum-compose')).toHaveLength(1);
        expect(document.querySelectorAll('[role="radio"]')).toHaveLength(13);

        fireEvent.click(document.querySelector('.octane-forum__thread-header'));
        emit(renderer.ThreadMessagesMessageEvent, { groupId: GROUP, threadId: 11, startIndex: 0, messages: MESSAGES });

        expect(document.querySelectorAll('.octane-forum__message')).toHaveLength(3);
        expect(document.querySelector('.octane-forum__thread')).toBeNull();
    });

    it('lists the forums in the desktop rows', () => {
        openList();

        expect(document.querySelectorAll('.octane-forum__forum')).toHaveLength(2);
        expect(document.querySelector('.octane-handheld-forum')).toBeNull();
    });
});
