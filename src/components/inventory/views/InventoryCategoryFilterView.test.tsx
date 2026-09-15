import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InventoryCategoryFilterView } from './InventoryCategoryFilterView';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('InventoryCategoryFilterView AIR filters', () => {
    it('applies search on Enter and clears on Escape', () => {
        const onSearchApply = vi.fn();
        const onSearchChange = vi.fn();

        render(
            <InventoryCategoryFilterView
                currentTab="inventory.furniture"
                mainFilter="all"
                searchValue="chair"
                typeFilter="any"
                onMainFilterChange={vi.fn()}
                onSearchApply={onSearchApply}
                onSearchChange={onSearchChange}
                onTypeFilterChange={vi.fn()}
            />
        );

        const input = screen.getByLabelText(/search inventory/i);
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onSearchApply).toHaveBeenCalledWith('chair');

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(onSearchChange).toHaveBeenCalledWith('');
        expect(onSearchApply).toHaveBeenCalledWith('');
    });

    it('renders AIR category filter controls for furniture', () => {
        render(
            <InventoryCategoryFilterView
                currentTab="inventory.furniture"
                mainFilter="all"
                searchValue=""
                typeFilter="any"
                onMainFilterChange={vi.fn()}
                onSearchApply={vi.fn()}
                onSearchChange={vi.fn()}
                onTypeFilterChange={vi.fn()}
            />
        );

        expect(screen.getByLabelText(/category/i)).toBeTruthy();
        expect(screen.getByLabelText(/^type$/i)).toBeTruthy();
    });
});
