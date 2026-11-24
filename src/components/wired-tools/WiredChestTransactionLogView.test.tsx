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

import { WiredChestRoomLogsComposer, WiredChestRoomLogsEvent, WiredChestTransactionDetailsComposer } from '@octane/renderer';
import { isChestLogPage, WiredChestTransactionLogView } from './WiredChestTransactionLogView';

const row = (transactionId: number, chestId: number) => ({ transactionId, chestId, chestKind: 0, type: 0, source: 0, userId: 1, userName: `user${transactionId}`, currencyType: -1, withdrawn: 0, deposited: 5, hasDetails: false, timestamp: 1700000000 });

const answer = (page: number, pageCount: number, rows: unknown[]) =>
    act(() => state.handlers.get(WiredChestRoomLogsEvent)?.({ getParser: () => ({ page, pageCount, totalRows: 25, filter: 0, rows }) }));

const requests = () => state.sent.filter((composer) => composer instanceof WiredChestRoomLogsComposer).map((composer) => composer.getMessageArray());

describe('chest transaction log window (AIR WiredTransactionLogsView)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        state.sent.length = 0;
        state.handlers.clear();
    });

    it('tells its own pages from the room log of the chests tab', () => {
        expect(isChestLogPage([{ chestId: 7 }, { chestId: 7 }], 7)).toBe(true);
        expect(isChestLogPage([], 7)).toBe(true);
        expect(isChestLogPage([{ chestId: 7 }, { chestId: 9 }], 7)).toBe(false);
    });

    it('asks for the first page of its chest and pages through the log', () => {
        render(<WiredChestTransactionLogView chestId={7} onClose={() => undefined} />);

        expect(requests()).toEqual([[10, 1, 0, 7]]);

        answer(1, 3, [row(1, 7), row(2, 7)]);
        expect(screen.getByText('user1')).toBeInTheDocument();
        // AIR transaction_overview: the list type and the chest id as key / value lines.
        expect(screen.getByText('wiredchests.logs.type.0')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'octane.wired_tools.first_page' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'octane.wired_tools.previous_page' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'octane.wired_tools.next_page' }));
        expect(requests().at(-1)).toEqual([10, 2, 0, 7]);

        answer(2, 3, [row(3, 7)]);
        expect(screen.getByText('user3')).toBeInTheDocument();
        expect(screen.queryByText('user1')).toBeNull();
    });

    it('leaves alone a page it did not ask for or that holds another chest', () => {
        render(<WiredChestTransactionLogView chestId={7} onClose={() => undefined} />);

        // The answer to the chests tab, which asked for the whole room at the same moment.
        answer(1, 9, [row(50, 7), row(51, 12)]);
        expect(screen.queryByText('user50')).toBeNull();

        answer(1, 1, [row(1, 7)]);
        expect(screen.getByText('user1')).toBeInTheDocument();

        // Nothing pending any more: a later page is someone else's.
        answer(1, 1, [row(99, 7)]);
        expect(screen.queryByText('user99')).toBeNull();
    });

    it('opens the furni of a transaction in the details window', () => {
        render(<WiredChestTransactionLogView chestId={7} onClose={() => undefined} />);

        answer(1, 1, [{ ...row(1, 7), hasDetails: true }]);
        fireEvent.click(screen.getByRole('button', { name: 'wiredchests.logs.details_text' }));

        expect(screen.getByText('wiredchests.log_details.title')).toBeInTheDocument();
        expect(state.sent.some((composer) => composer instanceof WiredChestTransactionDetailsComposer)).toBe(true);
    });
});
