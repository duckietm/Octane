import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    LocalizeText: (key: string) => key,
    GetRoomSession: () => ({ roomId: 77 })
}));

import { WiredVariablePicker } from './WiredVariablePicker';
import { buildWiredVariablePickerEntries, IWiredVariablePickerEntry } from './WiredVariablePickerData';
import { clearWiredVariablePickerHistory, finalizeWiredVariablePickers } from './WiredVariablePickerHistory';

const variable = (itemId: number, name: string, variableType = 0, hasValue = true) => ({ itemId, name, variableType, availability: 0, hasValue, isReadOnly: false });
const entries = buildWiredVariablePickerEntries('context', 'change-reference', [
    variable(1, 'event.transaction_complete.deposit.furni_count', 1),
    variable(2, 'event.transaction_complete.deposit.credits', 1),
    variable(3, 'event.variable_update.old_value', 1),
    variable(4, 'my_score', 0),
    variable(5, 'flag', 0, false)
]);
const rowNames = () => screen.queryAllByRole('option').map((row) => row.textContent);
const row = (name: string) => screen.getAllByRole('option').find((option) => option.textContent === name);
const hover = (name: string) => fireEvent.mouseEnter(row(name));
const open = () => fireEvent.click(screen.getByRole('textbox'));
const tab = (key: string) => fireEvent.click(screen.getByRole('button', { name: `wiredfurni.variable_picker.tab.${key}` }));

describe('Wired variable picker', () => {
    beforeEach(() => clearWiredVariablePickerHistory());
    afterEach(cleanup);

    it('opens on the user-created tab without a selection and on the internal tab for an internal variable', () => {
        render(<WiredVariablePicker entries={entries} selectedToken="" onSelect={vi.fn()} />);

        open();
        expect(screen.getByRole('button', { name: 'wiredfurni.variable_picker.tab.user_created' })).toHaveAttribute('aria-pressed', 'true');
        expect(rowNames()).toEqual(['my_score', 'flag']);
        cleanup();

        render(<WiredVariablePicker entries={entries} selectedToken={entries[2].token} onSelect={vi.fn()} />);
        open();
        expect(screen.getByRole('button', { name: 'wiredfurni.variable_picker.tab.internal' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('nests the tree to any depth and selects a leaf', () => {
        const onSelect = vi.fn();

        render(<WiredVariablePicker entries={entries} selectedToken="" onSelect={onSelect} />);
        open();
        tab('all');
        expect(rowNames().slice(0, 3)).toEqual(['event', 'my_score', 'flag']);
        hover('event');
        expect(rowNames().slice(-2)).toEqual(['transaction_complete', 'variable_update']);
        hover('transaction_complete');
        hover('deposit');
        expect(rowNames().slice(-2)).toEqual(['furni_count', 'credits']);
        // A branch without a variable is not selectable.
        fireEvent.click(row('deposit'));
        expect(onSelect).not.toHaveBeenCalled();
        fireEvent.click(row('credits'));
        expect(onSelect).toHaveBeenCalledWith(entries[1]);
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('greys variables the filter rejects and does not select them', () => {
        const onSelect = vi.fn();

        render(<WiredVariablePicker entries={entries} selectedToken="" onSelect={onSelect} />);
        open();
        expect(row('flag')).toHaveAttribute('title', 'wiredfurni.variable_picker.tooltip_disabled');
        fireEvent.click(row('flag'));
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('searches with every word and shows single matches by full name', () => {
        render(<WiredVariablePicker entries={entries} selectedToken="" onSelect={vi.fn()} />);
        open();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'old event' } });
        expect(screen.getByRole('button', { name: 'wiredfurni.variable_picker.tab.search' })).toHaveAttribute('aria-pressed', 'true');
        expect(rowNames()).toEqual(['event.variable_update.old_value']);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'deposit' } });
        // The box variables and AIR's built-in @event.transaction_complete.deposit.* parts.
        expect(rowNames()).toEqual(['event', '@event']);
    });

    it('takes the first search result on Enter and an exact name on Enter', () => {
        const onSelect = vi.fn();

        render(<WiredVariablePicker entries={entries} selectedToken="" onSelect={onSelect} />);
        open();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'old_value' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
        expect(onSelect).toHaveBeenLastCalledWith(entries[2]);
        open();
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'MY_SCORE' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
        expect(onSelect).toHaveBeenLastCalledWith(entries[3]);
    });

    it('hides invisible variables unless they are the stored selection', () => {
        const hidden: IWiredVariablePickerEntry[] = [...entries.slice(3, 5), { ...entries[3], id: 'custom:9', token: 'custom:9', label: 'secret', displayLabel: 'secret', isInvisible: true }];

        render(<WiredVariablePicker entries={hidden} selectedToken="" onSelect={vi.fn()} />);
        open();
        expect(rowNames()).toEqual(['my_score', 'flag']);
        cleanup();

        render(<WiredVariablePicker entries={hidden} selectedToken="custom:9" onSelect={vi.fn()} />);
        open();
        expect(rowNames()).toEqual(['my_score', 'flag', 'secret']);
    });

    it('records a selection in the recent tab only once the form is saved', () => {
        render(<WiredVariablePicker entries={entries} selectedToken={entries[3].token} onSelect={vi.fn()} />);
        open();
        tab('recent');
        expect(rowNames()).toEqual([]);
        finalizeWiredVariablePickers();
        tab('all');
        tab('recent');
        expect(rowNames()).toEqual(['my_score']);
    });
});
