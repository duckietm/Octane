import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api')>()),
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

import { WiredHolderPanelEntry, WiredVariableHolderPanelView, WiredVariableHolderPanelViewProps } from './WiredVariableHolderPanelView';

const entries: WiredHolderPanelEntry[] = [
    { id: '1', name: 'score', availability: 'Permanent', hasValue: true, value: 12 },
    { id: '2', name: 'flag', availability: 'Permanent', hasValue: false, value: null },
    { id: '3', name: 'locked', availability: 'Permanent', hasValue: true, value: 4, isReadOnly: true }
];

const props = (overrides: Partial<WiredVariableHolderPanelViewProps> = {}): WiredVariableHolderPanelViewProps => ({
    title: 'Manage User Variables',
    warningText: 'Use this tool to see and change the permanent variables of a user.',
    onRefresh: () => undefined,
    onClose: () => undefined,
    preview: null,
    infoLines: ['User type: Habbo', 'Name: duckie'],
    variablesTitle: 'Permanent variables:',
    entries,
    selectedId: null,
    onSelect: () => undefined,
    canEdit: true,
    editingId: null,
    editingValue: '',
    onBeginEdit: () => undefined,
    onEditingValueChange: () => undefined,
    onEditBlur: () => undefined,
    onEditKeyDown: () => undefined,
    isGiveOpen: false,
    onToggleGive: () => undefined,
    giveOptions: [],
    giveSelectedId: '',
    onGiveSelect: () => undefined,
    giveValue: '0',
    onGiveValueChange: () => undefined,
    canGive: true,
    onGive: () => undefined,
    canRemove: false,
    onRemove: () => undefined,
    ...overrides
});

describe('holder detail window (AIR variables_management_detail)', () => {
    afterEach(cleanup);

    it('selects a row on a click and edits a value only after a double click', () => {
        const onSelect = vi.fn();
        const onBeginEdit = vi.fn();

        render(<WiredVariableHolderPanelView {...props({ onSelect, onBeginEdit })} />);

        // No row is selected when the window opens.
        expect(screen.getAllByRole('row').some((row) => row.getAttribute('aria-selected') === 'true')).toBe(false);

        fireEvent.click(screen.getByText('12'));
        expect(onSelect).toHaveBeenCalledWith('1');
        expect(onBeginEdit).not.toHaveBeenCalled();

        fireEvent.doubleClick(screen.getByText('12'));
        expect(onBeginEdit).toHaveBeenCalledWith(entries[0]);
    });

    it('does not edit a variable without a value or a read-only one', () => {
        const onBeginEdit = vi.fn();

        render(<WiredVariableHolderPanelView {...props({ onBeginEdit })} />);

        fireEvent.doubleClick(screen.getByText('/'));
        fireEvent.doubleClick(screen.getByText('4'));

        expect(onBeginEdit).not.toHaveBeenCalled();
    });

    it('keeps Create off when there is nothing left to give', () => {
        render(<WiredVariableHolderPanelView {...props({ isGiveOpen: true })} />);

        // Give variable follows the write permission alone; the bubble's Create needs a variable to give.
        expect(screen.getByRole('button', { name: 'Give variable' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Remove variable' })).toBeDisabled();
    });
});
