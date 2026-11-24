import {
    CHEST_LOG_FILTER_ALL,
    CHEST_LOG_FILTER_CURRENCY,
    CHEST_LOG_FILTER_FURNI,
    CHEST_TRANSACTION_WITHDRAW,
    FurnitureType,
    IWiredChestTransactionRow,
    WiredChestRoomLogsComposer,
    WiredChestRoomLogsEvent,
    WiredChestTransactionDetailsComposer,
    WiredChestTransactionDetailsEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { localizeWithFallback, ProductImageUtility, SendMessageComposer } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { Select } from '../../common/Select';
import { useMessageEvent } from '../../hooks';
import { useWiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
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
 * Whether a page of the log answers this window. The answer does not say which request it is for, and the chests tab
 * of the wired menu asks for pages of the same log: a page with a row of another chest is the tab's, not this one's.
 */
export const isChestLogPage = (rows: ReadonlyArray<Pick<IWiredChestTransactionRow, 'chestId'>>, chestId: number): boolean =>
    rows.every((row) => row.chestId === chestId);

const formatTimestamp = (seconds: number): string => (seconds > 0 ? new Date(seconds * 1000).toLocaleString() : '-');

interface WiredChestTransactionLogViewProps {
    /** The chest whose transactions are listed. */
    chestId: number;
    onClose: () => void;
}

/** The server answers one page of this log per 500 ms. */
const REQUEST_RATELIMIT_MS = 520;

/**
 * AIR WiredTransactionLogsView on transaction_overview (880 wide) for one chest, opened by the chest window's "View
 * logs" button: the list type and chest id as key / value lines, Refresh on the right, the AIR table with a Details
 * column and the paging row. The furni of a transaction open in their own window, as AIR's transaction_details.
 */
export const WiredChestTransactionLogView: FC<WiredChestTransactionLogViewProps> = ({ chestId, onClose }) => {
    const [filter, setFilter] = useState(CHEST_LOG_FILTER_ALL);
    const [rows, setRows] = useState<IWiredChestTransactionRow[]>([]);
    const [page, setPage] = useState(NO_PAGE);
    const [pageCount, setPageCount] = useState(NO_PAGE);
    const [totalRows, setTotalRows] = useState(0);
    const [detailRow, setDetailRow] = useState<IWiredChestTransactionRow | null>(null);
    const [details, setDetails] = useState<Record<number, { spriteId: number; quantity: number }[]>>({});
    const [scrollResetKey, setScrollResetKey] = useState(0);
    // Pages asked for and not answered yet: an answer that comes while none is pending is someone else's.
    const pending = useRef(0);

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
        setDetailRow(null);
        sendRequest(1, filter);
    }, [filter, sendRequest]);

    useMessageEvent<WiredChestRoomLogsEvent>(WiredChestRoomLogsEvent, (event) => {
        const parser = event.getParser();

        if (!parser || pending.current <= 0 || !isChestLogPage(parser.rows, chestId)) return;

        pending.current--;
        setRows(parser.rows);
        setPage(parser.page);
        setPageCount(Math.max(1, parser.pageCount));
        setTotalRows(parser.totalRows);
        setScrollResetKey((value) => value + 1);
    });

    useMessageEvent<WiredChestTransactionDetailsEvent>(WiredChestTransactionDetailsEvent, (event) => {
        const parser = event.getParser();

        if (parser) setDetails((previous) => ({ ...previous, [parser.transactionId]: parser.items }));
    });

    const openDetail = (row: IWiredChestTransactionRow) => {
        setDetailRow(row);

        if (row.hasDetails && !details[row.transactionId]) SendMessageComposer(new WiredChestTransactionDetailsComposer(row.transactionId));
    };

    const typeText = (row: IWiredChestTransactionRow) =>
        row.type === CHEST_TRANSACTION_WITHDRAW ? localizeWithFallback('wiredchests.logs.type.withdraw', 'Withdrawal') : localizeWithFallback('wiredchests.logs.type.deposit', 'Deposit');

    const columns: WiredTableColumn[] = [
        { id: 'timestamp', title: localizeWithFallback('wiredchests.logs.col.timestamp', 'Timestamp'), className: 'w-[170px]' },
        { id: 'type', title: localizeWithFallback('wiredchests.logs.col.type', 'Type'), className: 'w-[120px]' },
        { id: 'username', title: localizeWithFallback('wiredchests.logs.col.username', 'Username') },
        { id: 'withdraws', title: localizeWithFallback('wiredchests.logs.col.withdraws', 'Withdrawals'), className: 'w-[110px]', align: 'right' },
        { id: 'deposits', title: localizeWithFallback('wiredchests.logs.col.deposits', 'Deposits'), className: 'w-[110px]', align: 'right' },
        { id: 'details', title: localizeWithFallback('wiredchests.logs.col.details', 'Details'), className: 'w-[80px]', align: 'right' }
    ];

    const getCell = (row: IWiredChestTransactionRow, columnId: string): WiredTableCell => {
        switch (columnId) {
            case 'timestamp':
                return { content: formatTimestamp(row.timestamp) };
            case 'type':
                return { content: typeText(row) };
            case 'username':
                return { content: row.userName || '-', title: row.userName };
            case 'withdraws':
                return { content: row.withdrawn || '-' };
            case 'deposits':
                return { content: row.deposited || '-' };
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

    const detailItems = detailRow ? details[detailRow.transactionId] : null;

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
                                        <b>{localizeWithFallback('wiredchests.logs.list_type', 'List type:')}</b> <span>{localizeWithFallback('wiredchests.logs.type.0', 'Chest')}</span>
                                    </div>
                                    <div>
                                        <b>{localizeWithFallback('wiredchests.logs.chest_id', 'Chest id:')}</b> <span>{chestId}</span>
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
                {detailRow && (
                    <OctaneCardView className="octane-widget-chest-log octane-chest-log-details" theme="primary-slim" uniqueKey="chest-transaction-details">
                        <OctaneCardHeaderView headerText={localizeWithFallback('wiredchests.log_details.title', 'Transaction details')} onCloseClick={() => setDetailRow(null)} />
                        <OctaneCardContentView>
                            <div className="octane-chest-log__detail">
                                <div>
                                    <b>{localizeWithFallback('wiredchests.log_details.timestamp', 'Timestamp:')}</b> <span>{formatTimestamp(detailRow.timestamp)}</span>
                                </div>
                                <div>
                                    <b>{localizeWithFallback('wiredchests.log_details.type', 'Transaction method:')}</b> <span>{typeText(detailRow)}</span>
                                </div>
                                <div>
                                    <b>{localizeWithFallback('wiredchests.log_details.username', 'Username:')}</b> <span>{detailRow.userName || '-'}</span>
                                </div>
                                <b>{localizeWithFallback('wiredchests.log_details.transactions', 'Transactions:')}</b>
                                {(!detailRow.hasDetails || (detailItems && !detailItems.length)) && <div>{localizeWithFallback('wiredchests.log_details.transactions.none_placeholder', 'Nothing')}</div>}
                                {detailRow.hasDetails && !detailItems && <div>...</div>}
                                {!!detailItems?.length && (
                                    <div className="octane-chest-log__items">
                                        {detailItems.map((item) => (
                                            <div key={item.spriteId} className="octane-chest-log__item">
                                                {/* The server negates a wall item's sprite id: the two kinds have their own id ranges. */}
                                                <img alt="" src={ProductImageUtility.getProductImageUrl(item.spriteId < 0 ? FurnitureType.WALL : FurnitureType.FLOOR, Math.abs(item.spriteId), '')} />
                                                <span>x{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </OctaneCardContentView>
                    </OctaneCardView>
                )}
            </>
        </NativeTextTree>
    );
};
