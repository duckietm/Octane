import { useEffect, useState } from 'react';
import type { WiredPagedTableProps } from '../WiredPagedTable';
import { HandheldWiredEmpty, HandheldWiredPager } from './HandheldWiredParts';

/**
 * WiredPagedTable on a phone: every row is a card instead of a table line. The column marked `handheld: 'title'` (or
 * the first one) heads the card, `meta` columns share one small line under it, an `action` column (Manage, View) sits at its foot, every other column is a
 * "title: value" line. The pager under it asks for pages through the very requests the table would use.
 */
export const HandheldWiredPagedList = <T,>(props: WiredPagedTableProps<T>) => {
    const { columns, rows, getRowId, getCell, currentPage, totalEntries, lastPage, requests, emptyText, scrollResetKey = 0, pagingTextKey = '' } = props;
    const [listElement, setListElement] = useState<HTMLDivElement | null>(null);
    const titleColumn = columns.find((column) => column.handheld === 'title') ?? columns[0];
    const actionColumns = columns.filter((column) => column.handheld === 'action');
    const metaColumns = columns.filter((column) => column !== titleColumn && column.handheld === 'meta');
    const lineColumns = columns.filter((column) => column !== titleColumn && !column.handheld);

    useEffect(() => {
        // A page the user asked for starts at its top, as in the table; the sheet's own scroller holds the list.
        const scroller = listElement?.closest('.octane-handheld-wired__scroll, .octane-handheld-wired__column');

        if (scroller) scroller.scrollTop = 0;
    }, [scrollResetKey, listElement]);

    return (
        <div ref={setListElement} className="octane-handheld-wired__paged" data-testid="wired-paged-list">
            {!rows.length && <HandheldWiredEmpty>{emptyText}</HandheldWiredEmpty>}
            {rows.map((row) => {
                const title = titleColumn ? getCell(row, titleColumn.id) : null;

                return (
                    <article key={getRowId(row)} className="octane-handheld-wired__entry" data-testid="wired-paged-entry">
                        {title && <div className={`octane-handheld-wired__entry-title ${title.className ?? ''}`.trim()}>{title.content}</div>}
                        {!!metaColumns.length && (
                            <div className="octane-handheld-wired__entry-meta">
                                {metaColumns.map((column) => {
                                    const cell = getCell(row, column.id);

                                    return (
                                        <span key={column.id} className={cell.className}>
                                            {cell.content}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                        {lineColumns.map((column) => {
                            const cell = getCell(row, column.id);

                            return (
                                <div key={column.id} className="octane-handheld-wired__pair">
                                    <span className="octane-handheld-wired__pair-label">{column.title}</span>
                                    <span className={`octane-handheld-wired__pair-value ${cell.className ?? ''}`.trim()}>{cell.content}</span>
                                </div>
                            );
                        })}
                        {!!actionColumns.length && (
                            <div className="octane-handheld-wired__entry-actions">
                                {actionColumns.map((column) => (
                                    <span key={column.id} className="octane-handheld-wired__entry-action">
                                        {getCell(row, column.id).content}
                                    </span>
                                ))}
                            </div>
                        )}
                    </article>
                );
            })}
            <HandheldWiredPager currentPage={currentPage} lastPage={lastPage} pagingTextKey={pagingTextKey} requests={requests} totalEntries={totalEntries} />
        </div>
    );
};
