import type { IWiredArrayInspectionData } from '@octane/renderer';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WiredArrayInspectionView } from './WiredArrayInspectionView';

afterEach(cleanup);

const inspection = (): IWiredArrayInspectionData => ({
    protocolVersion: 1,
    requestedOwnerType: 'room',
    requestedOwnerId: 0,
    ownerId: 8,
    hasArray: true,
    logicalLength: 50,
    occupiedCount: 1,
    page: 0,
    pageCount: 2,
    pageSize: 25,
    startIndex: 0,
    endIndex: 25,
    totalIndexes: 50,
    definition: {
        itemId: 9,
        variableType: 1,
        name: 'Inventory',
        valueShape: 'array',
        arrayFormat: 'simple',
        arrayMode: 'slots',
        maxEntries: 50,
        fields: [{ id: 1, name: 'Value', order: 0, textConnected: false }],
        inspectable: true,
        referenced: false,
        writable: true,
        schemaVersion: 1
    },
    entries: [
        { index: 0, occupied: false, values: {}, connectedText: {} },
        { index: 1, occupied: true, values: { '1': '0' }, connectedText: {} }
    ]
});

it('distinguishes vacancies from zero and preserves a draft across inspection refreshes', () => {
    const onUpdateField = vi.fn();
    const onPageChange = vi.fn();
    const data = inspection();
    const { rerender } = render(<WiredArrayInspectionView canModify data={data} onUpdateField={onUpdateField} onPageChange={onPageChange} />);
    const vacant = screen.getByLabelText('Inventory Value at index 0');
    expect(vacant).toHaveValue('');
    expect(screen.getByLabelText('Inventory Value at index 1')).toHaveValue('0');
    fireEvent.change(vacant, { target: { value: '12' } });
    rerender(<WiredArrayInspectionView canModify data={inspection()} onUpdateField={onUpdateField} onPageChange={onPageChange} />);
    expect(vacant).toHaveValue('12');
    fireEvent.change(vacant, { target: { value: '0' } });
    fireEvent.blur(vacant);
    expect(onUpdateField).toHaveBeenCalledWith(0, 1, '0');
    fireEvent.click(screen.getByText('Last'));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByText('Refresh'));
    expect(onPageChange).toHaveBeenLastCalledWith(0);
});

it('keeps read-only arrays non-editable', () => {
    render(<WiredArrayInspectionView canModify={false} data={inspection()} onUpdateField={vi.fn()} onPageChange={vi.fn()} />);
    expect(screen.queryByLabelText('Inventory Value at index 0')).not.toBeInTheDocument();
});
