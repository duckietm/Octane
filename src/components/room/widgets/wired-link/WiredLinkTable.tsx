import { ReactNode } from 'react';
import { BaseButton } from '../../../../common/BaseButton';

export interface WiredLinkColumn
{
    id: string;
    title: string;
    /** The column's share of the width (AIR TableColumn ratio). */
    fraction: number;
    left?: boolean;
}

interface WiredLinkTableProps<T>
{
    columns: WiredLinkColumn[];
    rows: T[];
    getRowId: (row: T) => string;
    getCell: (row: T, columnId: string) => ReactNode;
    emptyText?: string;
    bodyClassName?: string;
}

/** AIR TableView: a bold heading row, then alternating rows with the columns at fixed ratios. */
export const WiredLinkTable = <T,>(props: WiredLinkTableProps<T>) =>
{
    const { columns, rows, getRowId, getCell, emptyText = '', bodyClassName = 'h-[180px]' } = props;
    const template = { gridTemplateColumns: columns.map(column => `${ column.fraction }fr`).join(' ') };

    return (
        <div className="flex flex-col rounded border border-[#b8b2a4] bg-white text-[12px]" role="table">
            <div className="grid border-b border-[#d6d1c4] px-1 py-[3px] font-bold" role="row" style={ template }>
                { columns.map(column => <div key={ column.id } className={ `truncate px-1 ${ column.left ? 'text-left' : 'text-center' }` } role="columnheader">{ column.title }</div>) }
            </div>
            <div className={ `overflow-y-auto ${ bodyClassName }` } role="rowgroup">
                { (rows.length === 0) && emptyText && <div className="px-2 py-2 text-[#777]">{ emptyText }</div> }
                { rows.map((row, index) => (
                    <div key={ getRowId(row) } className="grid items-center px-1 py-[2px]" role="row" style={ { ...template, backgroundColor: (index % 2) ? '#f9f9f9' : '#eaeaea' } }>
                        { columns.map(column => <div key={ column.id } className={ `truncate px-1 ${ column.left ? 'text-left' : 'text-center' }` } role="cell">{ getCell(row, column.id) }</div>) }
                    </div>
                )) }
            </div>
        </div>
    );
};

/** AIR TableCell link: an underlined action in the cell. */
export const WiredLinkAction = (props: { text: string; onClick: () => void; disabled?: boolean; danger?: boolean }) =>
    <BaseButton className={ `cursor-pointer border-0 bg-transparent p-0 underline disabled:cursor-default disabled:opacity-40 ${ props.danger ? 'text-[#934343]' : 'text-[#0000ee]' }` } disabled={ props.disabled } type="button" onClick={ props.onClick }>{ props.text }</BaseButton>;
