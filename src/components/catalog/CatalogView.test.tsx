/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    currentType: 'NORMAL',
    isMod: false,
    adminMode: false,
    setAdminMode: vi.fn()
}));

vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    LocalizeText: (key: string) => key
}));

vi.mock('../../hooks', () => {
    const tab = { pageId: 1, pageName: 'furni', localization: 'Meubels', isVisible: true, isActive: true, iconId: 0, children: [] };

    return {
        CatalogEffectsHost: () => null,
        useCatalogActions: () => ({ activateNode: vi.fn(), openCatalogByType: vi.fn(), toggleCatalogByType: vi.fn() }),
        useCatalogData: () => ({ rootNode: { iconId: 1, children: [tab] }, currentPage: null, searchResult: null, isBusy: false }),
        useCatalogUiState: () => ({
            isVisible: true,
            setIsVisible: vi.fn(),
            navigationHidden: false,
            setNavigationHidden: vi.fn(),
            activeNodes: [tab],
            setSearchResult: vi.fn(),
            currentType: state.currentType
        }),
        useHasPermission: () => state.isMod,
        usePurse: () => ({ purse: null })
    };
});

vi.mock('./admin/studio/CatalogStudioProvider', () => ({ CatalogStudioProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('./CatalogAdminContext', () => ({
    CatalogAdminProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useCatalogAdmin: () => ({ adminMode: state.adminMode, setAdminMode: state.setAdminMode })
}));
vi.mock('./useCatalogWindowWidth', () => ({ parseCatalogTabLabel: (label: string) => ({ name: label }), useCatalogWindowWidth: () => ({}) }));
vi.mock('./views/admin/CatalogAdminManagerView', () => ({ CatalogAdminManagerView: () => null }));
vi.mock('./views/admin/CatalogAdminOfferEditView', () => ({ CatalogAdminOfferEditView: () => null }));
vi.mock('./views/admin/CatalogAdminPageEditView', () => ({ CatalogAdminPageEditView: () => null }));
vi.mock('./views/CatalogLoadingStateView', () => ({ CatalogLoadingStateView: () => null }));
vi.mock('./views/catalog-header/CatalogBuildersClubStatusView', () => ({ CatalogBuildersClubStatusView: () => null }));
vi.mock('./views/catalog-icon/CatalogIconView', () => ({ CatalogIconView: () => null }));
vi.mock('./views/gift/CatalogGiftView', () => ({ CatalogGiftView: () => null }));
vi.mock('./views/navigation/CatalogBreadcrumbView', () => ({ CatalogBreadcrumbView: () => null }));
vi.mock('./views/navigation/CatalogNavigationView', () => ({ CatalogNavigationView: () => null }));
vi.mock('./views/page/common/CatalogSearchView', () => ({ CatalogSearchView: () => null }));
vi.mock('./views/page/layout/marketplace/MarketplacePostOfferView', () => ({ MarketplacePostOfferView: () => null }));
vi.mock('./views/vip-benefits/VipBenefitsView', () => ({ VipBenefitsView: () => null }));
vi.mock('./views/page/layout/GetCatalogLayout', () => ({ GetCatalogLayout: () => null }));

import { CatalogView } from './CatalogView';

afterEach(() => {
    cleanup();
    state.setAdminMode.mockReset();
});

describe('CatalogView', () => {
    it('shows the page tabs in the normal shop', () => {
        state.currentType = 'NORMAL';
        state.isMod = false;
        const { container } = render(<CatalogView />);

        expect(document.querySelector('.octane-catalog-tabs-shell')).not.toBeNull();
        expect(document.querySelector('.octane-catalog-tab-label')).toHaveTextContent('Meubels');
        expect(screen.getByText('catalog.title')).toBeInTheDocument();
    });

    it('draws the Builders Club warehouse as AIR does: its own title and no tab row', () => {
        state.currentType = 'BUILDERS_CLUB';
        state.isMod = false;
        const { container } = render(<CatalogView />);

        expect(document.querySelector('.octane-catalog-tabs-shell')).toBeNull();
        expect(screen.queryByText('Meubels')).toBeNull();
        expect(screen.getByText('The Builders Club Warehouse')).toBeInTheDocument();
        expect(document.querySelector('.octane-catalog-builder-admin-toggle')).toBeNull();
    });

    it('keeps the staff admin toggle in the Builders Club header', () => {
        state.currentType = 'BUILDERS_CLUB';
        state.isMod = true;
        render(<CatalogView />);

        fireEvent.click(screen.getByRole('button', { name: 'Admin' }));

        expect(state.setAdminMode).toHaveBeenCalledWith(true, expect.anything());
    });
});
