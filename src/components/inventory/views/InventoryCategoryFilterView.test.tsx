import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    FurniCategory: { WALL_PAPER: 2, FLOOR: 3, LANDSCAPE: 4, POST_IT: 5, CREDIT_FURNI: 12, FIGURE_PURCHASABLE_SET: 23 }
}));

vi.mock('@octane/renderer', () => ({
    GetSessionDataManager: () => null
}));

vi.mock('../../../layout', () => ({
    OctaneInput: (props: Record<string, unknown>) => <input {...props} />
}));

import { InventoryCategoryFilterView } from './InventoryCategoryFilterView';

afterEach(cleanup);

describe('InventoryCategoryFilterView', () => {
    it('shows the type filter that belongs to the selected main filter', () => {
        const onTypeFilterChange = vi.fn();

        render(
            <InventoryCategoryFilterView
                currentTab="inventory.furni"
                mainFilter="wall_items"
                searchValue=""
                typeFilter="any"
                onMainFilterChange={() => undefined}
                onSearchChange={() => undefined}
                onTypeFilterChange={onTypeFilterChange}
            />
        );

        const typeSelect = screen.getByTestId('inventory-type-filter') as HTMLSelectElement;
        const labels = Array.from(typeSelect.options).map((option) => option.textContent);

        expect(labels).toEqual(['Any type', 'Windows', 'Dimmers', 'Stickies', 'Paintings', 'Tradable', 'Non-tradable', 'Recyclable']);

        fireEvent.change(typeSelect, { target: { value: 'dimmers' } });

        expect(onTypeFilterChange).toHaveBeenCalledWith('dimmers');
    });

    it('reports main filter changes and hides both dropdowns on the badges tab', () => {
        const onMainFilterChange = vi.fn();

        const { rerender } = render(
            <InventoryCategoryFilterView
                currentTab="inventory.furni"
                mainFilter="all"
                searchValue=""
                typeFilter="any"
                onMainFilterChange={onMainFilterChange}
                onSearchChange={() => undefined}
                onTypeFilterChange={() => undefined}
            />
        );

        fireEvent.change(screen.getByTestId('inventory-main-filter'), { target: { value: 'room_layout' } });

        expect(onMainFilterChange).toHaveBeenCalledWith('room_layout');

        rerender(
            <InventoryCategoryFilterView
                currentTab="inventory.badges"
                mainFilter="all"
                searchValue=""
                typeFilter="any"
                onMainFilterChange={onMainFilterChange}
                onSearchChange={() => undefined}
                onTypeFilterChange={() => undefined}
            />
        );

        expect(screen.queryByTestId('inventory-main-filter')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inventory-type-filter')).not.toBeInTheDocument();
    });
});
