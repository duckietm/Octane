import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    getCachedBadgeRarityStat: () => null,
    isCustomBadgeCode: (badgeCode: string) => badgeCode.startsWith('CUSTOM_'),
    LocalizeBadgeName: (key: string) => key,
    LocalizeBadgeDescription: (key: string) => key,
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

    it('runs the search on Enter and clears it on Escape like the official filter field', () => {
        const onSearchChange = vi.fn();

        render(
            <InventoryCategoryFilterView
                currentTab="inventory.furni"
                mainFilter="all"
                searchValue=""
                typeFilter="any"
                onMainFilterChange={() => undefined}
                onSearchChange={onSearchChange}
                onTypeFilterChange={() => undefined}
            />
        );

        const input = screen.getByTestId('inventory-search') as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'sofa' } });

        expect(onSearchChange).not.toHaveBeenCalled();
        expect(screen.getByTestId('inventory-search-clear')).toBeInTheDocument();

        fireEvent.keyUp(input, { key: 'Enter' });

        expect(onSearchChange).toHaveBeenLastCalledWith('sofa');

        fireEvent.keyUp(input, { key: 'Escape' });

        expect(onSearchChange).toHaveBeenLastCalledWith('');
        expect(input.value).toBe('');
        expect(screen.queryByTestId('inventory-search-clear')).not.toBeInTheDocument();
    });

    it('shows the badge type and rarity menus on the badges tab', () => {
        const onBadgeTypeFilterChange = vi.fn();
        const onBadgeRarityFilterChange = vi.fn();

        render(
            <InventoryCategoryFilterView
                badgeRarityFilter={-1}
                badgeRarityFilterIds={[-1, -2, 2]}
                badgeTypeFilter="all"
                currentTab="inventory.badges"
                mainFilter="all"
                searchValue=""
                typeFilter="any"
                onBadgeRarityFilterChange={onBadgeRarityFilterChange}
                onBadgeTypeFilterChange={onBadgeTypeFilterChange}
                onMainFilterChange={() => undefined}
                onSearchChange={() => undefined}
                onTypeFilterChange={() => undefined}
            />
        );

        const typeSelect = screen.getByTestId('inventory-badge-filter') as HTMLSelectElement;
        const raritySelect = screen.getByTestId('inventory-badge-rarity-filter') as HTMLSelectElement;

        expect(Array.from(typeSelect.options).map((option) => option.textContent)).toEqual(['All badges', 'Normal badges', 'Achievements', 'Custom badges']);
        expect(Array.from(raritySelect.options).map((option) => option.textContent)).toEqual(['All rarities', 'Common', 'Rare']);
        expect(raritySelect.disabled).toBe(false);

        fireEvent.change(typeSelect, { target: { value: 'achievements' } });
        fireEvent.change(raritySelect, { target: { value: '2' } });

        expect(onBadgeTypeFilterChange).toHaveBeenCalledWith('achievements');
        expect(onBadgeRarityFilterChange).toHaveBeenCalledWith(2);
    });

    it('disables the rarity menu while there is nothing to pick between', () => {
        render(
            <InventoryCategoryFilterView
                badgeRarityFilterIds={[-1, -2]}
                currentTab="inventory.badges"
                mainFilter="all"
                searchValue=""
                typeFilter="any"
                onMainFilterChange={() => undefined}
                onSearchChange={() => undefined}
                onTypeFilterChange={() => undefined}
            />
        );

        expect((screen.getByTestId('inventory-badge-rarity-filter') as HTMLSelectElement).disabled).toBe(true);
    });
});
