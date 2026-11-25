import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ sent: [] as any[], handlers: new Map<unknown, (event: unknown) => void>() }));

vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api')>()),
    localizeWithFallback: (key: string, _fallback: string, params?: string[], values?: string[]) =>
        params ? `${key}:${values.join('/')}` : key,
    SendMessageComposer: (composer: unknown) => state.sent.push(composer)
}));

vi.mock('../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../hooks')>()),
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler)
}));

import { WiredChestRoomLogsComposer, WiredChestRoomLogsEvent, WiredChestTransactionDetailsComposer, WiredChestTransactionDetailsEvent } from '@octane/renderer';
import { isChestLogPage, WiredChestTransactionLogView } from './WiredChestTransactionLogView';

const row = (transactionId: number, extra: Record<string, unknown> = {}) => ({
    transactionId,
    roomId: 9,
    method: 0,
    definitionInfo: '',
    userId: 1,
    userName: `user${transactionId}`,
    timestamp: 1700000000,
    readableTimestamp: '2026-11-25 10:00:00',
    chestCount: 1,
    withdrawnFurni: 0,
    depositedFurni: 0,
    withdrawnCoins: 0,
    depositedCoins: 5,
    ...extra
});

/** A page of one chest's list (listType 0) unless told otherwise. */
const answer = (page: number, total: number, rows: unknown[], list: { listType: number; listId: number } = { listType: 0, listId: 7 }) =>
    act(() => state.handlers.get(WiredChestRoomLogsEvent)?.({ getParser: () => ({ ...list, total, page, amount: 10, rows }) }));

const requests = () => state.sent.filter((composer) => composer instanceof WiredChestRoomLogsComposer).map((composer) => composer.getMessageArray());

describe('chest transaction log window (AIR WiredTransactionLogsView)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        state.sent.length = 0;
        state.handlers.clear();
    });

    it('tells its own pages from the other lists of the same message', () => {
        expect(isChestLogPage({ listType: 0, listId: 7 }, 7)).toBe(true);
        expect(isChestLogPage({ listType: 0, listId: 9 }, 7)).toBe(false);
        expect(isChestLogPage({ listType: 1, listId: 3 }, 7)).toBe(false);
        // The room's list, for the window the chests tab opens.
        expect(isChestLogPage({ listType: 1, listId: 3 }, 0)).toBe(true);
        expect(isChestLogPage({ listType: 0, listId: 7 }, 0)).toBe(false);
    });

    it('asks for the first page of its chest and pages through the log', () => {
        render(<WiredChestTransactionLogView chestId={7} onClose={() => undefined} />);

        expect(requests()).toEqual([[10, 1, 0, 7]]);

        answer(1, 25, [row(1), row(2)]);
        expect(screen.getByText('user1')).toBeInTheDocument();
        // AIR transaction_overview: the list type and the chest id as key / value lines.
        expect(screen.getByText('wiredchests.logs.type.0')).toBeInTheDocument();
        expect(screen.getByText('wiredchests.logs.chest_id')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'octane.wired_tools.first_page' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'octane.wired_tools.previous_page' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'octane.wired_tools.next_page' }));
        expect(requests().at(-1)).toEqual([10, 2, 0, 7]);

        answer(2, 25, [row(3)]);
        expect(screen.getByText('user3')).toBeInTheDocument();
        expect(screen.queryByText('user1')).toBeNull();
    });

    it('shows a transaction as AIR does: method, server time, both sides summed up, chest count', () => {
        render(<WiredChestTransactionLogView chestId={7} onClose={() => undefined} />);

        answer(1, 1, [row(1, { method: 4, chestCount: 3, withdrawnFurni: 2, withdrawnCoins: 0, depositedFurni: 1, depositedCoins: 30 })]);

        expect(screen.getByText('wired_transactions.type.4')).toBeInTheDocument();
        expect(screen.getByText('2026-11-25 10:00:00')).toBeInTheDocument();
        expect(screen.getByText('wiredchests.logs.only_furni:2')).toBeInTheDocument();
        expect(screen.getByText('wiredchests.logs.furni_and_coins:1/30')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('lists the room when opened from the chests tab', () => {
        render(<WiredChestTransactionLogView chestId={0} onClose={() => undefined} />);

        expect(requests()).toEqual([[10, 1, 0, 0]]);

        // A chest window's page is not this window's.
        answer(1, 1, [row(50)]);
        expect(screen.queryByText('user50')).toBeNull();

        answer(1, 1, [row(1)], { listType: 1, listId: 9 });
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('wiredchests.logs.type.1')).toBeInTheDocument();
        expect(screen.getByText('wiredchests.logs.room_id')).toBeInTheDocument();
    });

    it('leaves alone a page it did not ask for or that is another list', () => {
        render(<WiredChestTransactionLogView chestId={7} onClose={() => undefined} />);

        // The answer to the chests tab, which asked for the whole room at the same moment.
        answer(1, 90, [row(50)], { listType: 1, listId: 9 });
        expect(screen.queryByText('user50')).toBeNull();

        answer(1, 1, [row(1)]);
        expect(screen.getByText('user1')).toBeInTheDocument();

        // Nothing pending any more: a later page is someone else's.
        answer(1, 1, [row(99)]);
        expect(screen.queryByText('user99')).toBeNull();
    });

    it('opens the details window when the details it asked for arrive', () => {
        render(<WiredChestTransactionLogView chestId={7} onClose={() => undefined} />);

        answer(1, 1, [row(1)]);
        fireEvent.click(screen.getByRole('button', { name: 'wiredchests.logs.details_text' }));
        expect(state.sent.some((composer) => composer instanceof WiredChestTransactionDetailsComposer)).toBe(true);
        expect(screen.queryByText('wiredchests.log_details.title')).toBeNull();

        const details = (transactionId: number) => ({
            transaction: row(transactionId, { method: 2, definitionInfo: '55, x2', withdrawnFurni: 3, depositedCoins: 0 }),
            transactionId,
            chestIds: [7, 8],
            withdrawn: [{ wallItem: false, typeId: 88, posterId: '', quantity: 1 }],
            deposited: [],
            incomplete: true
        });

        // Details another window asked for.
        act(() => state.handlers.get(WiredChestTransactionDetailsEvent)?.({ getParser: () => details(44) }));
        expect(screen.queryByText('wiredchests.log_details.title')).toBeNull();

        act(() => state.handlers.get(WiredChestTransactionDetailsEvent)?.({ getParser: () => details(1) }));
        expect(screen.getByText('wiredchests.log_details.title')).toBeInTheDocument();
        expect(screen.getByText('wired_transactions.type.2')).toBeInTheDocument();
        expect(screen.getByText('7, 8')).toBeInTheDocument();
        expect(screen.getByText('55, x2')).toBeInTheDocument();
        expect(screen.getByText('x1')).toBeInTheDocument();
        expect(screen.getByText('wiredchests.log_details.incomplete_data')).toBeInTheDocument();
        // Nothing was deposited.
        expect(screen.getByText('wiredchests.log_details.transactions.none_placeholder')).toBeInTheDocument();
    });
});
