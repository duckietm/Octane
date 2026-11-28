/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { IMentionEntry } from '../../api/mentions';
import { useHandheldStore } from '../../state/handheldStore';

const requestMentions = vi.fn();
const requestMoreMentions = vi.fn();
const goto = vi.fn();
const open = vi.fn();
const remove = vi.fn();
const markAll = vi.fn();

vi.mock('../../api', async () => {
    const mentions = await import('../../api/mentions');

    return {
        ...mentions,
        LocalizeText: (key: string) => key,
        localizeWithFallback: (_key: string, fallback: string) => fallback
    };
});
vi.mock('../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../common', () => ({
    Button: (props: { children: ReactNode; onClick: () => void }) => <button onClick={props.onClick}>{props.children}</button>,
    LayoutAvatarImageView: () => null,
    OctaneCardView: (props: { children: ReactNode }) => <div data-testid="desktop-card">{props.children}</div>,
    OctaneCardContentView: (props: { children: ReactNode }) => <div>{props.children}</div>,
    OctaneCardHeaderView: (props: { headerText: string }) => <h1>{props.headerText}</h1>
}));

vi.mock('../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));

vi.mock('../../hooks', async () => {
    const snapshot = await import('../../hooks/mentions/useMentionsSnapshot');

    return {
        useMentionsSnapshot: snapshot.useMentionsSnapshot,
        useMentionActions: () => ({ open, goto, remove, markAll }),
        requestMentions,
        requestMoreMentions
    };
});

vi.mock('../../hooks/session/useSessionSnapshots', () => ({ useUserDataSnapshot: () => ({ userName: 'Bob' }) }));

const { MentionsView } = await import('./MentionsView');
const store = await import('../../hooks/mentions/mentionsStore');

const make = (id: number, over: Partial<IMentionEntry> = {}): IMentionEntry => ({
    mentionId: id,
    senderId: 7,
    senderUsername: 'Alice',
    senderFigure: '',
    roomId: 9,
    roomName: 'Lobby',
    message: `hello @Bob ${id}`,
    mentionType: 0,
    timestamp: Math.floor(Date.now() / 1000),
    read: false,
    ...over
});

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));

beforeEach(() => {
    vi.clearAllMocks();
    requestMentions.mockReset();
    store.resetMentions();
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('the mentions on a phone', () => {
    it('is a full-screen sheet with the filters as tabs and the unread count on "Unread"', () => {
        store.setMentions([make(1), make(2, { read: true, mentionType: 1, roomId: 0, roomName: '' })]);
        phone();
        render(<MentionsView onClose={() => undefined} />);

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(screen.queryByTestId('desktop-card')).toBeNull();
        expect(document.querySelector('.octane-handheld-sheet__title')?.textContent).toBe('mentions.window.title (1)');

        const tabs = [...document.querySelectorAll('.octane-handheld-sheet__tab')];
        expect(tabs.map((tab) => tab.querySelector('.octane-handheld-sheet__tab-label')?.textContent)).toEqual([
            'mentions.filter.all',
            'mentions.filter.unread',
            'mentions.filter.direct',
            'mentions.filter.room'
        ]);
        expect(tabs[1].querySelector('.octane-handheld-sheet__tab-count')?.textContent).toBe('1');
        // Under "Today", the unread card is marked; a mention without a room has no "Go to room".
        expect(within(screen.getByTestId('mentions-list')).getByText('mentions.group.today')).toBeTruthy();
        expect(screen.getByTestId('mention-1').dataset.unread).toBe('true');
        expect(screen.getByTestId('mention-2').dataset.unread).toBeUndefined();
        expect(within(screen.getByTestId('mention-2')).queryByText('mentions.action.goto')).toBeNull();
    });

    it('filters from a tab and by search, and clears the filters when nothing matches', () => {
        store.setMentions([make(1), make(2, { read: true, senderUsername: 'Carl' })]);
        phone();
        render(<MentionsView onClose={() => undefined} />);

        fireEvent.click(screen.getByRole('tab', { name: /mentions.filter.unread/ }));
        expect(screen.queryByTestId('mention-2')).toBeNull();
        expect(screen.getByTestId('mention-1')).toBeTruthy();

        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nobody' } });
        expect(screen.getByText('No mention matches.')).toBeTruthy();

        fireEvent.click(screen.getByText('Clear the filters'));
        expect(screen.getByTestId('mention-2')).toBeTruthy();
        expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
    });

    it('reads a mention by tapping its card, and reaches the room and remove from it', () => {
        store.setMentions([make(1)]);
        phone();
        render(<MentionsView onClose={() => undefined} />);

        const card = screen.getByTestId('mention-1');
        fireEvent.click(within(card).getByRole('button', { name: /Alice: hello/ }));

        expect(open).toHaveBeenCalledWith(expect.objectContaining({ mentionId: 1 }));
        expect(card.dataset.expanded).toBe('true');

        fireEvent.click(within(card).getByText('mentions.action.goto'));
        fireEvent.click(within(card).getByRole('button', { name: 'mentions.action.remove' }));

        expect(goto).toHaveBeenCalledWith(expect.objectContaining({ mentionId: 1 }));
        expect(remove).toHaveBeenCalledWith(expect.objectContaining({ mentionId: 1 }));
    });

    it('marks all read and refreshes from the bottom bar; "mark all" only while something is unread', () => {
        store.setMentions([make(1)]);
        store.setMentionsStatus('ready');
        phone();
        const { unmount } = render(<MentionsView onClose={() => undefined} />);
        const bar = document.querySelector('.octane-handheld-mentions__bar') as HTMLElement;

        fireEvent.click(within(bar).getByText('mentions.window.markall'));
        fireEvent.click(within(bar).getByText('Refresh'));

        expect(markAll).toHaveBeenCalledTimes(1);
        expect(requestMentions).toHaveBeenCalledTimes(1);

        unmount();
        store.setMentions([make(1, { read: true })]);
        render(<MentionsView onClose={() => undefined} />);

        expect(within(document.querySelector('.octane-handheld-mentions__bar') as HTMLElement).queryByText('mentions.window.markall')).toBeNull();
    });

    it('loads older mentions at the end of the list, and offers a retry after an error', () => {
        store.setMentions([make(1)], true);
        phone('landscape');
        const { unmount } = render(<MentionsView onClose={() => undefined} />);

        fireEvent.click(screen.getByText('Load older mentions'));
        expect(requestMoreMentions).toHaveBeenCalledTimes(1);

        unmount();
        store.resetMentions();
        store.setMentionsStatus('error');
        render(<MentionsView onClose={() => undefined} />);
        requestMentions.mockClear();
        fireEvent.click(screen.getByText('Try again'));

        expect(requestMentions).toHaveBeenCalledTimes(1);
    });

    it('closes from the header', () => {
        const onClose = vi.fn();

        phone();
        render(<MentionsView onClose={onClose} />);
        fireEvent.click(document.querySelector('.octane-handheld-sheet__caption-button.is-close'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('keeps the desktop window off the phone', () => {
        store.setMentions([make(1)]);
        render(<MentionsView onClose={() => undefined} />);

        expect(screen.getByTestId('desktop-card')).toBeTruthy();
        expect(document.querySelector('.octane-handheld-mentions')).toBeNull();
    });
});
