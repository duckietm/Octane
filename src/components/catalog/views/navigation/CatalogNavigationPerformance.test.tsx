import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CatalogNavigationView } from './CatalogNavigationView';

const mocks = vi.hoisted(() => ({
    useCatalogActions: vi.fn(() => ({ activateNode: vi.fn() })),
    useCatalogAdmin: vi.fn(() => ({
        adminMode: false,
        deletePage: vi.fn(),
        reorderPage: vi.fn(),
        setCreatingPage: vi.fn(),
        setEditingPageData: vi.fn(),
        setEditingPageNode: vi.fn(),
        setEditingRootPage: vi.fn()
    }))
}));

vi.mock('../../../../hooks', () => ({
    useCatalogActions: mocks.useCatalogActions,
    useCatalogData: () => ({ searchResult: null })
}));

vi.mock('../../CatalogAdminContext', () => ({ useCatalogAdmin: mocks.useCatalogAdmin }));
vi.mock('../catalog-icon/CatalogIconView', () => ({ CatalogIconView: () => null }));

const leaf = (pageId: number) =>
    ({
        pageId,
        localization: `Category ${pageId}`,
        iconId: 0,
        isActive: false,
        isBranch: false,
        isOpen: false,
        isVisible: true,
        depth: 1,
        children: []
    }) as any;

describe('catalog navigation subscription cost', () => {
    it('subscribes to catalog and admin state once for a large subcategory list', () => {
        const root = { children: Array.from({ length: 38 }, (_, index) => leaf(index + 1)) } as any;

        render(<CatalogNavigationView node={root} />);

        expect(mocks.useCatalogActions).toHaveBeenCalledTimes(1);
        expect(mocks.useCatalogAdmin).toHaveBeenCalledTimes(1);
    });
});
