import { ReactNode, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../api';
import { WiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { clampInputPage, NO_PAGE, parseInputPage, restrictPageInput } from './WiredPaging.helpers';
import { BaseButton } from '../../common/BaseButton';
import { Hint } from '../../common/Tooltip';

export interface WiredTableColumn {
    id: string;
    title: string;
    /** Tailwind width class of the header cell, e.g. `w-[120px]`; the last column takes the rest. */
    className?: string;
    align?: 'left' | 'right';
}

export interface WiredTableCell {
    content: ReactNode;
    /** The full text shown on hover when the cell is cut short. */
    title?: string;
    className?: string;
}

export interface WiredPagedTableProps<T> {
    columns: WiredTableColumn[];
    rows: T[];
    getRowId: (row: T) => string;
    getCell: (row: T, columnId: string) => WiredTableCell;
    /** 1-based; `NO_PAGE` while no page has arrived. */
    currentPage: number;
    totalEntries: number;
    lastPage: number;
    requests: WiredPageRequests;
    emptyText: string;
    /** Bumped by the window when a page the user asked for should scroll back to the top. */
    scrollResetKey?: number;
    /** Height class of the scrolling body. */
    bodyClassName?: string;
}

const PAGE_BUTTON_CLASS = 'min-w-[36px] rounded border border-[#b8b2a4] bg-white px-2 py-1 text-[12px] disabled:opacity-40';

/**
 * A table over a pagination footer: first / previous / a page field / next / last, and the
 * "N found. Showing page [ ] of M" line. The caller says which page is shown and hands in the
 * rate limited requests, so the header's own refresh button and filters share the limiter.
 */
export const WiredPagedTable = <T,>(props: WiredPagedTableProps<T>) => {
    const { columns, rows, getRowId, getCell, currentPage, totalEntries, lastPage, requests, emptyText, scrollResetKey = 0, bodyClassName = 'max-h-[300px]' } = props;
    const [pageInput, setPageInput] = useState(currentPage === NO_PAGE ? '1' : String(currentPage));
    const [bodyElement, setBodyElement] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        setPageInput(currentPage === NO_PAGE ? '1' : String(currentPage));
    }, [currentPage]);

    useEffect(() => {
        if (bodyElement) bodyElement.scrollTop = 0;
    }, [scrollResetKey, bodyElement]);

    const isFirst = currentPage !== NO_PAGE && currentPage <= 1;
    const isLast = currentPage !== NO_PAGE && lastPage !== NO_PAGE && currentPage >= lastPage;

    const navigateToInputPage = () => {
        const typed = parseInputPage(pageInput);
        const clamped = clampInputPage(typed, lastPage);

        if (clamped !== typed) setPageInput(String(clamped));
        if (clamped === currentPage) return;

        requests.requestPage(clamped);
    };

    return (
        <div className="flex flex-col gap-2 min-h-0 grow">
            <div ref={setBodyElement} className={`overflow-y-auto border border-[#d1ccbf] rounded bg-white ${bodyClassName}`} data-testid="wired-paged-table-body">
                <table className="w-full text-[12px] table-fixed">
                    <thead className="bg-[#efede5] sticky top-0">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.id} className={`px-2 py-1 ${column.align === 'right' ? 'text-right' : 'text-left'} ${column.className ?? ''}`}>
                                    {column.title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {!rows.length && (
                            <tr>
                                <td className="px-2 py-3 text-center text-[#8b8678]" colSpan={columns.length}>
                                    {emptyText}
                                </td>
                            </tr>
                        )}
                        {rows.map((row, index) => (
                            <tr key={getRowId(row)} className={index % 2 === 0 ? 'bg-white' : 'bg-[#f8f6f0]'}>
                                {columns.map((column) => {
                                    const cell = getCell(row, column.id);

                                    return (
                                        <td
                                            key={column.id}
                                            className={`px-2 py-1 truncate ${column.align === 'right' ? 'text-right' : ''} ${cell.className ?? ''}`}
                                            title={cell.title}
                                        >
                                            {cell.content}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2">
                    <Hint content="First page"><BaseButton aria-label="First page" className={PAGE_BUTTON_CLASS} disabled={isFirst} type="button" onClick={() => requests.requestFirstPage()}>
                        &laquo;
                    </BaseButton></Hint>
                    <Hint content="Previous page"><BaseButton aria-label="Previous page" className={PAGE_BUTTON_CLASS} disabled={isFirst} type="button" onClick={() => requests.requestPreviousPage()}>
                        &lsaquo;
                    </BaseButton></Hint>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#555]">
                    {currentPage !== NO_PAGE && (
                        <span>
                            {localizeWithFallback(
                                'wiredmenu.paged_table.found',
                                '%entries_count% found. Showing page',
                                ['entries_count'],
                                [String(totalEntries)]
                            )}
                        </span>
                    )}
                    <input
                        aria-label="Page"
                        className="w-[42px] rounded border border-[#b8b2a4] bg-white px-1 py-[2px] text-center text-[12px]"
                        type="text"
                        inputMode="numeric"
                        value={pageInput}
                        onChange={(event) => setPageInput(restrictPageInput(event.target.value))}
                        onBlur={navigateToInputPage}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;

                            event.preventDefault();
                            navigateToInputPage();
                        }}
                    />
                    {currentPage !== NO_PAGE && (
                        <span>{localizeWithFallback('wiredmenu.paged_table.of', 'of %page_count%', ['page_count'], [String(Math.max(1, lastPage))])}</span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Hint content="Next page"><BaseButton aria-label="Next page" className={PAGE_BUTTON_CLASS} disabled={isLast} type="button" onClick={() => requests.requestNextPage()}>
                        &rsaquo;
                    </BaseButton></Hint>
                    <Hint content="Last page"><BaseButton aria-label="Last page" className={PAGE_BUTTON_CLASS} disabled={isLast} type="button" onClick={() => requests.requestLastPage()}>
                        &raquo;
                    </BaseButton></Hint>
                </div>
            </div>
        </div>
    );
};
