import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IMentionEntry } from '../../api/mentions';

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

vi.mock('../../common', () => ({
    Button: (props: { children: ReactNode; onClick: () => void }) => <button onClick={props.onClick}>{props.children}</button>,
    LayoutAvatarImageView: () => null,
    OctaneCardView: (props: { children: ReactNode }) => <div>{props.children}</div>,
    OctaneCardContentView: (props: { children: ReactNode }) => <div>{props.children}</div>,
    OctaneCardHeaderView: (props: { headerText: string }) => <h1>{props.headerText}</h1>
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

describe('MentionsView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requestMentions.mockReset();
        store.resetMentions();
    });

    afterEach(() => cleanup());

    it('asks for the list when it was never asked for, and says it is loading', () => {
        requestMentions.mockImplementation(() => store.setMentionsStatus('loading'));

        render(<MentionsView onClose={() => undefined} />);

        expect(requestMentions).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Loading mentions...')).toBeTruthy();
    });

    it('does not ask again when the list is already there', () => {
        store.setMentions([make(1)]);

        render(<MentionsView onClose={() => undefined} />);

        expect(requestMentions).not.toHaveBeenCalled();
    });

    it('tells the open panel to the store while it is mounted', () => {
        store.setMentions([make(1)]);

        const { unmount } = render(<MentionsView onClose={() => undefined} />);

        expect(store.isMentionsPanelOpen()).toBe(true);

        unmount();

        expect(store.isMentionsPanelOpen()).toBe(false);
    });

    it('shows an error with a way to try again', () => {
        store.setMentionsStatus('error');
        requestMentions.mockClear();

        render(<MentionsView onClose={() => undefined} />);
        requestMentions.mockClear();
        fireEvent.click(screen.getByText('Try again'));

        expect(requestMentions).toHaveBeenCalledTimes(1);
    });

    it('says when a filter matches nothing and clears it', () => {
        store.setMentions([make(1)]);

        render(<MentionsView onClose={() => undefined} />);
        fireEvent.click(screen.getByText('mentions.filter.room'));

        expect(screen.getByText('No mention matches.')).toBeTruthy();

        fireEvent.click(screen.getByText('Clear the filters'));

        expect(screen.getByRole('list').textContent).toContain('hello');
    });

    it('reports the filter state to assistive technology', () => {
        store.setMentions([make(1)]);

        render(<MentionsView onClose={() => undefined} />);

        expect(screen.getByText('mentions.filter.all').getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByText('mentions.filter.direct').getAttribute('aria-pressed')).toBe('false');
    });

    it('opens a mention from its row and reaches goto and delete as buttons', () => {
        store.setMentions([make(1)]);

        render(<MentionsView onClose={() => undefined} />);
        fireEvent.click(screen.getByRole('button', { name: /Alice: hello/ }));
        fireEvent.click(screen.getByRole('button', { name: 'mentions.action.goto' }));
        fireEvent.click(screen.getByRole('button', { name: 'mentions.action.remove' }));

        expect(open).toHaveBeenCalledTimes(1);
        expect(goto).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledTimes(1);
    });

    it('marks everything read from the button, and the panel does not do it by itself', () => {
        store.setMentions([make(1), make(2)]);

        render(<MentionsView onClose={() => undefined} />);

        expect(markAll).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('mentions.window.markall'));

        expect(markAll).toHaveBeenCalledTimes(1);
    });

    it('takes a mention that lands while it is open', () => {
        store.setMentions([make(1)]);

        render(<MentionsView onClose={() => undefined} />);
        act(() => store.addMention(make(2, { message: 'second @Bob' })));

        expect(screen.getByRole('list').textContent).toContain('second');
    });
});

describe('MentionsView paging', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requestMentions.mockReset();
        requestMoreMentions.mockReset();
        store.resetMentions();
    });

    afterEach(() => cleanup());

    it('offers older mentions only when the server has more', () => {
        store.setMentions([make(1)], false);

        render(<MentionsView onClose={() => undefined} />);

        expect(screen.queryByText('Load older mentions')).toBeNull();

        cleanup();
        store.setMentions([make(1)], true);
        render(<MentionsView onClose={() => undefined} />);
        fireEvent.click(screen.getByText('Load older mentions'));

        expect(requestMoreMentions).toHaveBeenCalledTimes(1);
    });

    it('disables the button while the page loads', () => {
        store.setMentions([make(1)], true);
        store.setLoadingMoreMentions(true);

        render(<MentionsView onClose={() => undefined} />);

        expect((screen.getByText('Loading...') as HTMLButtonElement).disabled).toBe(true);
    });
});
