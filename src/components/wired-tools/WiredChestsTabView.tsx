import {
    CHEST_LOG_FILTER_ALL,
    CHEST_LOG_FILTER_CURRENCY,
    CHEST_LOG_FILTER_FURNI,
    CHEST_LOG_LIST_ROOM,
    IWiredChestTransactionRow,
    RoomControllerLevel,
    WiredChestLockComposer,
    WiredChestRoomLogsComposer,
    WiredChestRoomLogsEvent,
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../api';
import { Button, Text } from '../../common';
import { useMessageEvent, useNotification, useRoom } from '../../hooks';
import { Select } from '../../common/Select';
import { BaseButton } from '../../common/BaseButton';
import { Hint } from '../../common/Tooltip';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { WiredChestTransactionLogView } from './WiredChestTransactionLogView';
import { chestTransactionMethodText, summarizeChestTransaction } from './WiredChestTransactions.helpers';

/** Rows per request. The preview and the detail window share one page size, so one response shape
 * serves both and there is never a question of which request a page belongs to. */
const PAGE_SIZE = 10;

/** Matches the official tab: the preview refreshes on its own while it is the visible tab. */
const POLL_MS = 20000;

/** The official tab greys the lock buttons briefly after a click so a double click cannot fire twice. */
const LOCK_COOLDOWN_MS = 500;

const FILTERS = [
    { value: CHEST_LOG_FILTER_ALL, key: 'wiredmenu.chests.room_logs.furni_and_coins', fallback: 'Furni and coins' },
    { value: CHEST_LOG_FILTER_CURRENCY, key: 'wiredmenu.chests.room_logs.only_coins', fallback: 'Only coins' },
    { value: CHEST_LOG_FILTER_FURNI, key: 'wiredmenu.chests.room_logs.only_furni', fallback: 'Only furni' },
];

export const WiredChestsTabView: FC<{}> = () => {
    const { roomSession = null } = useRoom();
    const { showConfirm = null } = useNotification();

    const [filter, setFilter] = useState(CHEST_LOG_FILTER_ALL);
    const [rows, setRows] = useState<IWiredChestTransactionRow[]>([]);
    const [page, setPage] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const [detailsOpen, setDetailsOpen] = useState(false);

    const [lockBusy, setLockBusy] = useState(false);

    // The detail window drives paging; while it is open the preview must not poll page 1 out from
    // under it. Held in a ref so the interval effect does not restart on every open/close.
    const pendingPages = useRef(0);
    const detailsOpenRef = useRef(false);
    detailsOpenRef.current = detailsOpen;

    const canManageOwn = !!roomSession && (roomSession.isRoomOwner || roomSession.controllerLevel >= RoomControllerLevel.GUEST);
    const canManageAll = !!roomSession?.isRoomOwner;

    const requestPage = useCallback(
        (nextPage: number, nextFilter: number) => {
            pendingPages.current++;
            SendMessageComposer(new WiredChestRoomLogsComposer(PAGE_SIZE, nextPage, nextFilter, 0));
        },
        [],
    );

    useEffect(() => {
        requestPage(1, filter);
    }, [filter, requestPage]);

    useEffect(() => {
        const handle = window.setInterval(() => {
            if (detailsOpenRef.current) return;

            requestPage(1, filter);
        }, POLL_MS);

        return () => window.clearInterval(handle);
    }, [filter, requestPage]);

    useMessageEvent<WiredChestRoomLogsEvent>(WiredChestRoomLogsEvent, (event) => {
        const parser = event.getParser();
        // The detailed list and every open chest window ask for pages of this message too: only a page of the
        // room's log that this tab asked for is its preview.
        if (!parser || pendingPages.current <= 0 || parser.listType !== CHEST_LOG_LIST_ROOM) return;

        pendingPages.current--;
        setRows(parser.rows);
        setPage(parser.page);
        setTotalRows(parser.total);
        setLoaded(true);
    });

    const sendLock = useCallback(
        (lock: boolean, all: boolean) => {
            if (lockBusy) return;

            // AIR WiredMenuChestsTab.startLockTimeout: the lock gets no answer, so the buttons grey for a short
            // time-out and every chest shows its new state through its furni data.
            setLockBusy(true);
            SendMessageComposer(new WiredChestLockComposer(lock, all));
            window.setTimeout(() => setLockBusy(false), LOCK_COOLDOWN_MS);
        },
        [lockBusy],
    );

    const lockEveryChest = useCallback(() => {
        if (!canManageAll || !showConfirm) return;

        showConfirm(
            localizeWithFallback(
                'wiredmenu.chests.chest_control.lock_all.warning.desc',
                'This locks every chest in the room, including the ones other people own. Wired keeps working - only what people do by hand stops.',
            ),
            () => sendLock(true, true),
            () => {
                // nothing to undo: the confirm was declined before anything was sent
            },
            null,
            null,
            localizeWithFallback('wiredmenu.chests.chest_control.lock_all.warning.title', 'Lock every chest'),
        );
    }, [canManageAll, sendLock, showConfirm]);

    const closeDetails = useCallback(() => {
        setDetailsOpen(false);
        requestPage(1, filter);
    }, [filter, requestPage]);

    const previewRows = useMemo(() => (page === 1 ? rows : []), [page, rows]);

    const renderPreviewBody = () => {
        if (!loaded) return null;

        if (!previewRows.length) {
            return (
                <NativeTextTree>
                    <div className="p-3 text-[12px] text-[#6b6659]">
                        {localizeWithFallback('wiredmenu.chests.room_logs.empty', 'No transactions yet.')}
                    </div>
                </NativeTextTree>
            );
        }

        return (
            <NativeTextTree>
                <table className="w-full text-[12px]">
                    <thead className="bg-[#efede5] sticky top-0">
                        <tr>
                            <th className="text-left px-2 py-1">{localizeWithFallback('wiredmenu.chests.room_logs.column.type', 'Type')}</th>
                            <th className="text-left px-2 py-1">
                                {localizeWithFallback('wiredmenu.chests.room_logs.column.username', 'Username')}
                            </th>
                            <th className="text-right px-2 py-1">
                                {localizeWithFallback('wiredmenu.chests.room_logs.column.withdraws', 'Withdrawals')}
                            </th>
                            <th className="text-right px-2 py-1">
                                {localizeWithFallback('wiredmenu.chests.room_logs.column.deposits', 'Deposits')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {previewRows.map((row) => (
                            <tr key={row.transactionId} className="border-t border-[#e4e0d5]">
                                {/* AIR TransactionPreviewTableObject: the method, the user and what each side moved. */}
                                <td className="px-2 py-1">{chestTransactionMethodText(row.method)}</td>
                                <td className="px-2 py-1">{row.userName || '-'}</td>
                                <td className="px-2 py-1 text-right tabular-nums">{summarizeChestTransaction(row.withdrawnFurni, row.withdrawnCoins)}</td>
                                <td className="px-2 py-1 text-right tabular-nums">{summarizeChestTransaction(row.depositedFurni, row.depositedCoins)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </NativeTextTree>
        );
    };

    return (
        <NativeTextTree>
            <>
                <div className="p-3 flex flex-col gap-3">
                    <div className="bg-white rounded border border-[#b9b3a5] p-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <Text bold>{localizeWithFallback('wiredmenu.chests.room_logs.title', 'Room transaction log')}</Text>
                            <Select
                                className="rounded border border-[#7f7f7f] bg-[#ece9e1] px-2 py-[2px] text-[12px] text-[#333]"
                                value={filter}
                                onChange={(event) => setFilter(parseInt(event.target.value, 10))}
                            >
                                {FILTERS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {localizeWithFallback(option.key, option.fallback)}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="max-h-[180px] overflow-y-auto border border-[#d1ccbf] rounded">{renderPreviewBody()}</div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] text-[#6b6659] tabular-nums">
                                {localizeWithFallback('wiredmenu.chests.room_logs.total', '%count% transactions', ['count'], [String(totalRows)])}
                            </span>
                            <Button disabled={!totalRows} variant="secondary" onClick={() => setDetailsOpen(true)}>
                                {localizeWithFallback('wiredmenu.chests.room_logs.view_in_detail', 'View in detail')}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white rounded border border-[#b9b3a5] p-2 flex flex-col gap-2">
                        <Text bold>{localizeWithFallback('wiredmenu.chests.chest_control.title', 'Chest control')}</Text>
                        <div className="text-[12px] text-[#6b6659]">
                            {localizeWithFallback(
                                'wiredmenu.chests.chest_control.hint',
                                'A locked chest still answers wired - only what people do by hand is blocked, in both directions.',
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button disabled={!canManageOwn || lockBusy} variant="secondary" onClick={() => sendLock(true, false)}>
                                {localizeWithFallback('wiredmenu.chests.chest_control.lock_own', 'Lock my chests')}
                            </Button>
                            <Button disabled={!canManageOwn || lockBusy} variant="secondary" onClick={() => sendLock(false, false)}>
                                {localizeWithFallback('wiredmenu.chests.chest_control.unlock_own', 'Unlock my chests')}
                            </Button>
                            <Button disabled={!canManageAll || lockBusy} variant="danger" onClick={lockEveryChest}>
                                {localizeWithFallback('wiredmenu.chests.chest_control.lock_all', 'Lock every chest')}
                            </Button>
                        </div>
                        {!canManageAll && (
                            <div className="text-[12px] text-[#8c877d]">
                                {localizeWithFallback('wiredmenu.chests.chest_control.owner_only', 'Only the room owner can lock every chest.')}
                            </div>
                        )}
                    </div>
                </div>

                {/* AIR: "View detailed list" opens the transaction log window on the room's list. */}
                {detailsOpen && <WiredChestTransactionLogView chestId={0} onClose={closeDetails} />}
            </>
        </NativeTextTree>
    );
};
