import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogItemGridWidgetView } from './CatalogItemGridWidgetView';

const catalogState = vi.hoisted(() => ({
    currentPage: { offers: [], pageId: 1 },
    currentType: 'NORMAL'
}));

vi.mock('../../../../../hooks', () => ({
    useCatalogActions: () => ({ selectCatalogOffer: vi.fn() }),
    useCatalogData: () => ({ currentOffer: null, currentPage: catalogState.currentPage }),
    useCatalogUiState: () => ({ currentType: catalogState.currentType, setCurrentPage: vi.fn() }),
    useInventoryFurni: () => ({ isVisible: false })
}));

describe('CatalogItemGridWidgetView responsive grid ownership', () => {
    afterEach(cleanup);

    it('applies the shared auto-fill grid class to every multi-column offer template', () => {
        render(<CatalogItemGridWidgetView columnCount={6} />);

        expect(screen.getByRole('listbox', { name: 'Catalog items' })).toHaveClass('octane-catalog-grid');
    });

    it('does not turn a specialized single-column selector into an auto-fill grid', () => {
        render(<CatalogItemGridWidgetView columnCount={1} />);

        expect(screen.getByRole('listbox', { name: 'Catalog items' })).not.toHaveClass('octane-catalog-grid');
    });
});
