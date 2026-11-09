import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setSelectedItem = vi.fn();
const bed = { name: 'Bed', items: [], stuffData: {}, getLastItem: () => null } as any;

vi.mock('../../../../hooks', () => ({
    useInventoryFurni: () => ({ groupItems: [bed], selectedItem: bed, setSelectedItem, activate: () => 1, deactivate: () => {} }),
    useInventoryUnseenTracker: () => ({ resetItems: () => {} }),
    usePlayTestRestricted: () => false,
    useMarketplaceConfiguration: () => ({ data: null })
}));
vi.mock('../InventoryCategoryEmptyView', () => ({ InventoryCategoryEmptyView: () => <div className="empty-view" /> }));

import { InventoryFurnitureView } from './InventoryFurnitureView';

afterEach(cleanup);

describe('InventoryFurnitureView', () => {
    it('shows the empty view for a tab without items, even when other tabs hold furni', () => {
        const { container } = render(<InventoryFurnitureView filteredGroupItems={[]} roomPreviewer={null} roomSession={null} sectionGroupItems={[]} />);

        expect(container.querySelector('.empty-view')).not.toBeNull();
        expect(container.querySelector('.octane-inventory-furni')).toBeNull();
        // The bed of the furni tab does not stay selected in the empty rentables tab.
        expect(setSelectedItem).toHaveBeenCalledWith(null);
    });
});
