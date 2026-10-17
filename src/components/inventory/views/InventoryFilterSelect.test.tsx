/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../test-utils/selectOption';
import { InventoryFilterSelect } from './InventoryFilterSelect';

describe('InventoryFilterSelect', () => {
    afterEach(() => cleanup());

    it('shows the current option and reports the picked value', () => {
        const onChange = vi.fn();

        render(
            <InventoryFilterSelect aria-label="Sort" value="b" onChange={onChange}>
                <option value="a">Newest</option>
                <option value="b">Oldest</option>
                <option value="c">Name</option>
            </InventoryFilterSelect>
        );

        const trigger = screen.getByRole('combobox', { name: 'Sort' });

        expect(trigger.textContent).toBe('Oldest');
        expect(trigger.classList.contains('octane-inventory-filter-select')).toBe(true);

        selectOption(trigger, 'Name');

        expect(onChange).toHaveBeenCalledWith('c');
    });

    it('falls back to the first option for an unknown value and stays closed when disabled', () => {
        render(
            <InventoryFilterSelect disabled aria-label="Kind" value="zzz">
                <option value="a">All</option>
                <option value="b">Pets</option>
            </InventoryFilterSelect>
        );

        const trigger = screen.getByRole('combobox', { name: 'Kind' });

        expect(trigger.textContent).toBe('All');

        trigger.click();

        expect(screen.queryByRole('option')).toBeNull();
    });
});
