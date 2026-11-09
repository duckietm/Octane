/* @vitest-environment jsdom */

import { act, cleanup, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    sent: [] as { userId: number; kind: number }[]
}));

vi.mock('@octane/renderer', () => ({
    GetModeratorUserRecordsMessageComposer: class {
        constructor(
            public userId: number,
            public kind: number
        ) {}
    },
    ModeratorUserRecordsEvent: class {}
}));
vi.mock('../../../api', () => ({
    SendMessageComposer: (composer: { userId: number; kind: number }) => state.sent.push(composer),
    localizeWithFallback: (_key: string, fallback: string, parameters: string[] = null, replacements: string[] = null) =>
        (parameters ?? []).reduce((text, name, index) => text.replace(`%${name}%`, replacements[index]), fallback)
}));
vi.mock('../../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler)
}));
vi.mock('../../../common/native-text/NativeTextTree', () => ({ NativeTextTree: ({ children }: { children?: ReactNode }) => <>{children}</> }));
vi.mock('../native/NativeWindowShell', () => ({ NativeWindowShell: ({ children }: { children?: ReactNode }) => <>{children}</> }));
vi.mock('../native/NativeWindow0', () => ({
    Native0Frame: ({ caption, children }: { caption: string; children?: ReactNode }) => (
        <section aria-label={caption}>
            <h1>{caption}</h1>
            {children}
        </section>
    ),
    Native0Rows: () => null,
    Native0Scrollbar: () => null,
    Native0Text: ({ text }: { text: string }) => <span>{text}</span>
}));

import { ModeratorUserRecordsEvent } from '@octane/renderer';
import { formatRecordTime, UserRecordKind, UserRecordsView } from './UserRecordsView';

const record = (overrides: Partial<Record<string, string | number>> = {}) => ({
    timestamp: 1_700_000_000,
    username: 'target',
    staffName: 'mod1',
    type: 'ban',
    reason: 'spamming',
    expires: 0,
    ...overrides
});

const answer = (userId: number, kind: number, records: ReturnType<typeof record>[], undetailed = 0) =>
    act(() => state.handlers.get(ModeratorUserRecordsEvent)?.({ getParser: () => ({ userId, kind, undetailed, records }) }));

const open = (kind: UserRecordKind, userId = 7) =>
    render(
        <UserRecordsView
            height={240}
            kind={kind}
            userId={userId}
            userName="target"
            width={560}
            x={0}
            y={0}
            onClose={() => undefined}
            onResize={() => undefined}
        />
    );

describe('UserRecordsView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        state.handlers.clear();
        state.sent.length = 0;
    });

    it('asks once for the records of this user and kind and shows nothing until they arrive', () => {
        const { container, rerender } = open(1);

        rerender(
            <UserRecordsView height={240} kind={1} userId={7} userName="target" width={560} x={0} y={0} onClose={() => undefined} onResize={() => undefined} />
        );

        expect(state.sent).toEqual([expect.objectContaining({ userId: 7, kind: 1 })]);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the rows of an answer for this user and kind, with the kind in the title', () => {
        open(1);
        answer(7, 1, [record({ expires: 1_700_086_400 }), record({ staffName: '', reason: 'scamming' })]);

        expect(screen.getByRole('heading', { name: 'Bans: target' })).toBeInTheDocument();
        expect(screen.getAllByTestId('user-record')).toHaveLength(2);
        expect(screen.getByText('spamming')).toBeInTheDocument();
        expect(screen.getByText('scamming')).toBeInTheDocument();
        expect(screen.getByText(formatRecordTime(1_700_086_400))).toBeInTheDocument();
        // the unknown staff and the missing expiry both show a dash
        expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
        expect(screen.queryByText('Account')).toBeNull();
    });

    it('shows the account column only for the banned accounts of a user', () => {
        open(2);
        answer(7, 2, [record({ username: 'alt_account' })]);

        expect(screen.getByRole('heading', { name: 'Banned accounts: target' })).toBeInTheDocument();
        expect(screen.getByText('Account')).toBeInTheDocument();
        expect(screen.getByText('alt_account')).toBeInTheDocument();
    });

    it('ignores the answer for another user or another kind', () => {
        const { container } = open(0);

        answer(8, 0, [record()]);
        answer(7, 1, [record()]);

        expect(container).toBeEmptyDOMElement();
    });

    it('counts the cautions recorded without details', () => {
        open(0);
        answer(7, 0, [record({ type: 'caution' })], 3);

        expect(screen.getByRole('heading', { name: 'Cautions: target' })).toBeInTheDocument();
        expect(screen.getByText('3 earlier cautions without details')).toBeInTheDocument();
        expect(screen.queryByText('No records')).toBeNull();
    });

    it('says so when there is no record', () => {
        open(3);
        answer(7, 3, []);

        expect(screen.getByRole('heading', { name: 'Trade locks: target' })).toBeInTheDocument();
        expect(screen.getByText('No records')).toBeInTheDocument();
        expect(screen.queryAllByTestId('user-record')).toHaveLength(0);
    });

    it('writes an unknown time as a dash', () => {
        expect(formatRecordTime(0)).toBe('—');
        expect(formatRecordTime(1_700_000_000)).toMatch(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/);
    });
});
