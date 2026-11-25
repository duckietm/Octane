import { ReactNode, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../api';
import { WiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { clampInputPage, DEFAULT_PAGING_TEXT, NO_PAGE, parseInputPage, restrictPageInput, splitPagingText } from './WiredPaging.helpers';
import { BaseButton } from '../../common/BaseButton';
import { Hint } from '../../common/Tooltip';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

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
    /** The window's footer text, e.g. `wiredmenu.logs_overview.bottom_text`, with `%page%` where the page field sits. */
    pagingTextKey?: string;
}

/**
 * A table over a pagination footer: first / previous / a page field / next / last, and the
 * "N found. Showing page [ ] of M" line. The caller says which page is shown and hands in the
 * rate limited requests, so the header's own refresh button and filters share the limiter.
 */
export const WiredPagedTable = <T,>(props: WiredPagedTableProps<T>) => {
    const { columns, rows, getRowId, getCell, currentPage, totalEntries, lastPage, requests, emptyText, scrollResetKey = 0, bodyClassName = 'max-h-[300px]', pagingTextKey = '' } = props;
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
    const pagingText = currentPage === NO_PAGE ? null : splitPagingText(localizeWithFallback(pagingTextKey, DEFAULT_PAGING_TEXT), totalEntries, Math.max(1, lastPage));

    const navigateToInputPage = () => {
        const typed = parseInputPage(pageInput);
        const clamped = clampInputPage(typed, lastPage);

        if (clamped !== typed) setPageInput(String(clamped));
        if (clamped === currentPage) return;

        requests.requestPage(clamped);
    };

    const pageButton = (label: string, disabled: boolean, onClick: () => void, arrows: ('is-left' | 'is-right')[]) => (
        <Hint content={label}>
            <BaseButton aria-label={label} className="octane-wired-table__page-button" disabled={disabled} type="button" onClick={onClick}>
                {arrows.map((direction, index) => (
                    <i key={index} aria-hidden className={`octane-wired-table__arrow ${direction}`} />
                ))}
            </BaseButton>
        </Hint>
    );

    // AIR wired_menu_table_view inside its window: the bordered table, then the paging row with two thick buttons on
    // each side (first / previous, next / last) and the page line with its field centred between them.
    return (
        <NativeTextTree>
            <div className="octane-wired-table">
                <div ref={setBodyElement} className={`octane-wired-table__border ${bodyClassName}`} data-testid="wired-paged-table-body">
                    <table>
                        <thead>
                            <tr>
                                {columns.map((column) => (
                                    <th key={column.id} className={`${column.align === 'right' ? 'is-right' : ''} ${column.className ?? ''}`}>
                                        {column.title}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {!rows.length && (
                                <tr className="is-empty">
                                    <td colSpan={columns.length}>{emptyText}</td>
                                </tr>
                            )}
                            {rows.map((row) => (
                                <tr key={getRowId(row)}>
                                    {columns.map((column) => {
                                        const cell = getCell(row, column.id);

                                        return (
                                            <td key={column.id} className={`${column.align === 'right' ? 'is-right' : ''} ${cell.className ?? ''}`} title={cell.title}>
                                                {cell.content}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="octane-wired-table__paging">
                    <div className="octane-wired-table__buttons">
                        {pageButton(localizeWithFallback('octane.wired_tools.first_page', 'First page'), isFirst, () => requests.requestFirstPage(), ['is-left', 'is-left'])}
                        {pageButton(localizeWithFallback('octane.wired_tools.previous_page', 'Previous page'), isFirst, () => requests.requestPreviousPage(), ['is-left'])}
                    </div>
                    <div className="octane-wired-table__page-line">
                        {pagingText && <span>{pagingText.start}</span>}
                        <input
                            aria-label={localizeWithFallback('octane.wired_tools.page', 'Page')}
                            className="octane-wired-table__page-input"
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
                        {pagingText && <span>{pagingText.end}</span>}
                    </div>
                    <div className="octane-wired-table__buttons is-right">
                        {pageButton(localizeWithFallback('octane.wired_tools.next_page', 'Next page'), isLast, () => requests.requestNextPage(), ['is-right'])}
                        {pageButton(localizeWithFallback('octane.wired_tools.last_page', 'Last page'), isLast, () => requests.requestLastPage(), ['is-right', 'is-right'])}
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
