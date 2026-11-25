import {
    CHEST_LOG_FILTER_ALL,
    CHEST_LOG_FILTER_CURRENCY,
    CHEST_LOG_FILTER_FURNI,
    CHEST_LOG_LIST_CHEST,
    CHEST_LOG_LIST_ROOM,
    IWiredChestTransactionRow,
    WiredChestRoomLogsComposer,
    WiredChestRoomLogsEvent,
    WiredChestTransactionDetailsComposer,
    WiredChestTransactionDetailsEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { Select } from '../../common/Select';
import { useMessageEvent } from '../../hooks';
import { useWiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { WiredChestTransactionDetails, WiredChestTransactionDetailsView } from './WiredChestTransactionDetailsView';
import { chestTransactionMethodText, lastChestLogPage, summarizeChestTransaction } from './WiredChestTransactions.helpers';
import { WiredPagedTable, WiredTableCell, WiredTableColumn } from './WiredPagedTable';
import { NO_PAGE } from './WiredPaging.helpers';

/** Rows per page, the size the chests tab asks for too. */
export const CHEST_LOG_PAGE_SIZE = 10;

const FILTERS = [
    { value: CHEST_LOG_FILTER_ALL, key: 'wiredmenu.chests.room_logs.furni_and_coins', fallback: 'Furni and coins' },
    { value: CHEST_LOG_FILTER_CURRENCY, key: 'wiredmenu.chests.room_logs.only_coins', fallback: 'Only coins' },
    { value: CHEST_LOG_FILTER_FURNI, key: 'wiredmenu.chests.room_logs.only_furni', fallback: 'Only furni' }
];

/**
 * Whether a page of the log answers this window. The list says which log it is: one chest's (and which chest), or
 * the room's. The chests tab of the wired menu and every open chest window ask for pages of the same message.
 */
export const isChestLogPage = (list: { listType: number; listId: number }, chestId: number): boolean =>
    chestId > 0 ? list.listType === CHEST_LOG_LIST_CHEST && list.listId === chestId : list.listType === CHEST_LOG_LIST_ROOM;

interface WiredChestTransactionLogViewProps {
    /** The chest whose transactions are listed; zero lists the whole room. */
    chestId: number;
    onClose: () => void;
}

/** The server answers one page of this log per 500 ms. */
const REQUEST_RATELIMIT_MS = 520;

/**
 * AIR WiredTransactionLogsView on transaction_overview (880 wide), for one chest (the chest window's "View logs"
 * button) or for the room (the chests tab's "View detailed list"): the list type and its id as key / value lines,
 * Refresh on the right, AIR's columns (type, timestamp, username, withdrawals, deposits, chests, details) and the
 * paging row. A line is one transaction, however many chests it touched; "View" opens AIR's transaction_details.
 */
export const WiredChestTransactionLogView: FC<WiredChestTransactionLogViewProps> = ({ chestId, onClose }) => {
    const [filter, setFilter] = useState(CHEST_LOG_FILTER_ALL);
    const [rows, setRows] = useState<IWiredChestTransactionRow[]>([]);
    const [page, setPage] = useState(NO_PAGE);
    const [pageCount, setPageCount] = useState(NO_PAGE);
    const [totalRows, setTotalRows] = useState(0);
    const [listId, setListId] = useState(chestId);
    const [details, setDetails] = useState<WiredChestTransactionDetails | null>(null);
    const [scrollResetKey, setScrollResetKey] = useState(0);
    // Pages asked for and not answered yet: an answer that comes while none is pending is someone else's.
    const pending = useRef(0);
    // The transaction whose details this window asked for: the answer opens the details window.
    const awaitedDetails = useRef(0);

    const sendRequest = useCallback(
        (nextPage: number, nextFilter: number) => {
            pending.current++;
            SendMessageComposer(new WiredChestRoomLogsComposer(CHEST_LOG_PAGE_SIZE, nextPage, nextFilter, chestId));
        },
        [chestId]
    );

    const requests = useWiredPageRequests({
        currentPage: page,
        lastPage: pageCount,
        pageKey: rows,
        ratelimit: REQUEST_RATELIMIT_MS,
        samePageTimeout: false,
        onRequestPage: (nextPage) => sendRequest(nextPage, filter)
    });

    // The first page on opening and after a change of filter.
    useEffect(() => {
        setDetails(null);
        sendRequest(1, filter);
    }, [filter, sendRequest]);

    useMessageEvent<WiredChestRoomLogsEvent>(WiredChestRoomLogsEvent, (event) => {
        const parser = event.getParser();

        if (!parser || pending.current <= 0 || !isChestLogPage(parser, chestId)) return;

        pending.current--;
        setRows(parser.rows);
        setPage(parser.page);
        setPageCount(lastChestLogPage(parser.total, parser.amount || CHEST_LOG_PAGE_SIZE));
        setTotalRows(parser.total);
        setListId(parser.listId);
        setScrollResetKey((value) => value + 1);
    });

    useMessageEvent<WiredChestTransactionDetailsEvent>(WiredChestTransactionDetailsEvent, (event) => {
        const parser = event.getParser();

        if (!parser?.transaction || parser.transactionId !== awaitedDetails.current) return;

        awaitedDetails.current = 0;
        setDetails({ transaction: parser.transaction, chestIds: parser.chestIds, withdrawn: parser.withdrawn, deposited: parser.deposited, incomplete: parser.incomplete });
    });

    const openDetail = (row: IWiredChestTransactionRow) => {
        awaitedDetails.current = row.transactionId;
        SendMessageComposer(new WiredChestTransactionDetailsComposer(row.transactionId));
    };

    // AIR's columns and their order (WiredTransactionLogsView.createTransactionTable).
    const columns: WiredTableColumn[] = [
        { id: 'type', title: localizeWithFallback('wiredchests.logs.col.type', 'Type'), className: 'w-[150px]' },
        { id: 'timestamp', title: localizeWithFallback('wiredchests.logs.col.timestamp', 'Timestamp'), className: 'w-[140px]' },
        { id: 'username', title: localizeWithFallback('wiredchests.logs.col.username', 'Username') },
        { id: 'withdraws', title: localizeWithFallback('wiredchests.logs.col.withdraws', 'Withdrawals'), className: 'w-[125px]' },
        { id: 'deposits', title: localizeWithFallback('wiredchests.logs.col.deposits', 'Deposits'), className: 'w-[125px]' },
        { id: 'chests', title: localizeWithFallback('wiredchests.logs.col.chests', 'Chests'), className: 'w-[95px]' },
        { id: 'details', title: localizeWithFallback('wiredchests.logs.col.details', 'Details'), className: 'w-[80px]' }
    ];

    const getCell = (row: IWiredChestTransactionRow, columnId: string): WiredTableCell => {
        switch (columnId) {
            case 'type':
                return { content: chestTransactionMethodText(row.method) };
            case 'timestamp':
                return { content: row.readableTimestamp || '-' };
            case 'username':
                return { content: row.userName || '-', title: row.userName };
            case 'withdraws':
                return { content: summarizeChestTransaction(row.withdrawnFurni, row.withdrawnCoins) };
            case 'deposits':
                return { content: summarizeChestTransaction(row.depositedFurni, row.depositedCoins) };
            case 'chests':
                return { content: String(row.chestCount) };
            default:
                // table_view element_link: the underlined link of the Details column.
                return {
                    content: (
                        <BaseButton className="octane-chest-log__details" type="button" onClick={() => openDetail(row)}>
                            {localizeWithFallback('wiredchests.logs.details_text', 'View')}
                        </BaseButton>
                    )
                };
        }
    };

    const roomList = chestId <= 0;

    return (
        <NativeTextTree>
            <>
                <OctaneCardView className="octane-widget-chest-log octane-chest-log" theme="primary-slim" uniqueKey={`chest-transaction-log-${chestId}`}>
                    <OctaneCardHeaderView headerText={localizeWithFallback('wiredchests.logs.title', 'Transaction log')} onCloseClick={onClose} />
                    <OctaneCardContentView>
                        <div className="octane-chest-log__body">
                            <div className="octane-chest-log__header">
                                <div className="octane-chest-log__pairs">
                                    <div>
                                        <b>{localizeWithFallback('wiredchests.logs.list_type', 'List type:')}</b>{' '}
                                        <span>{roomList ? localizeWithFallback('wiredchests.logs.type.1', 'Room') : localizeWithFallback('wiredchests.logs.type.0', 'Chest')}</span>
                                    </div>
                                    <div>
                                        <b>{roomList ? localizeWithFallback('wiredchests.logs.room_id', 'Room id:') : localizeWithFallback('wiredchests.logs.chest_id', 'Chest id:')}</b>{' '}
                                        <span>{listId > 0 ? listId : '-'}</span>
                                    </div>
                                </div>
                                <label className="octane-chest-log__filter">
                                    <span>{localizeWithFallback('wiredchests.logs.item_type_filter', 'Filter item type:')}</span>
                                    <Select value={filter} onChange={(event) => setFilter(parseInt(event.target.value, 10))}>
                                        {FILTERS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {localizeWithFallback(option.key, option.fallback)}
                                            </option>
                                        ))}
                                    </Select>
                                </label>
                                <Button variant="secondary" onClick={() => requests.refresh()}>
                                    {localizeWithFallback('wiredchests.logs.refresh', 'Refresh')}
                                </Button>
                            </div>
                            <WiredPagedTable
                                bodyClassName="octane-chest-log__table"
                                columns={columns}
                                currentPage={page}
                                emptyText={localizeWithFallback('wiredchests.logs.empty', 'No transactions yet.')}
                                getCell={getCell}
                                getRowId={(row) => String(row.transactionId)}
                                lastPage={pageCount}
                                pagingTextKey="wiredchests.logs.bottom_text"
                                requests={requests}
                                rows={rows}
                                scrollResetKey={scrollResetKey}
                                totalEntries={totalRows}
                            />
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
                {details && <WiredChestTransactionDetailsView details={details} onClose={() => setDetails(null)} />}
            </>
        </NativeTextTree>
    );
};
