import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogAdminManagerView } from './CatalogAdminManagerView';

const mocks = vi.hoisted(() => ({
    rootNode: null as any,
    currentPage: null as any,
    currentOffer: null as any,
    setCurrentOffer: vi.fn(),
    setCurrentPage: vi.fn(),
    activateNode: vi.fn(),
    catalogAdmin: null as any,
    studio: null as any
}));

vi.mock('../../../../api', () => ({
    GetConfigurationValue: () => '',
    LocalizeText: (key: string) => key,
    ProductTypeEnum: { FLOOR: 's', WALL: 'i' }
}));

vi.mock('../../../../common', () => ({
    OctaneCardView: ({ children }: any) => <div>{children}</div>,
    OctaneCardHeaderView: () => null,
    OctaneCardContentView: ({ children }: any) => <div>{children}</div>
}));

vi.mock('../../../../hooks', () => ({
    useCatalogData: () => ({
        rootNode: mocks.rootNode,
        currentPage: mocks.currentPage,
        currentOffer: mocks.currentOffer
    }),
    useCatalogUiState: () => ({
        setCurrentPage: mocks.setCurrentPage,
        setCurrentOffer: mocks.setCurrentOffer,
        currentType: 'NORMAL'
    }),
    useCatalogActions: () => ({ activateNode: mocks.activateNode })
}));

vi.mock('../../CatalogAdminContext', () => ({
    useCatalogAdmin: () => mocks.catalogAdmin
}));

vi.mock('../../admin/studio/useCatalogStudio', () => ({
    useCatalogStudio: () => mocks.studio
}));

vi.mock('../../admin/studio/CatalogStudioTransferPanel', () => ({
    CatalogStudioTransferPanel: () => null
}));

vi.mock('../../admin/studio/CatalogStudioProblemsHistoryPanel', () => ({
    CatalogStudioProblemsHistoryPanel: () => null
}));

vi.mock('../../useCatalogWindowWidth', () => ({
    parseCatalogTabLabel: (localization: any) => ({ name: localization?.name ?? '' })
}));

vi.mock('./CatalogAdminDraftTree', () => ({
    buildCatalogAdminDraftTree: (rootNode: any) => rootNode,
    planCatalogAdminPageDrop: () => null,
    resolveCatalogAdminPageDropPosition: () => 'inside'
}));

vi.mock('../catalog-icon/CatalogIconView', () => ({ CatalogIconView: () => null }));
vi.mock('./CatalogAdminOfferPriceView', () => ({ CatalogAdminOfferPriceView: () => null }));

const offer = (offerId: number, name: string) => {
    const product = {
        productType: 's',
        productClassId: offerId + 1000,
        productCount: 1,
        extraParam: '',
        furnitureData: { className: `furni_${offerId}`, hasIndexedColor: false, colorIndex: 0 },
        getIconUrl: () => null
    };

    return {
        offerId,
        localizationName: name,
        priceInCredits: 0,
        priceInActivityPoints: 0,
        activityPointType: 0,
        product,
        products: [ product ]
    };
};

const pageNode = (pageId: number, name: string) => ({
    pageId,
    pageName: name,
    localization: { name },
    children: [],
    iconId: 0,
    isVisible: true,
    parent: null
});

describe('CatalogAdminManagerView selection synchronization', () => {
    let pageOne: any;
    let pageTwo: any;
    let offerOne: any;
    let offerTwo: any;

    beforeEach(() => {
        vi.clearAllMocks();
        offerOne = offer(101, 'Offer One');
        offerTwo = offer(102, 'Offer Two');
        pageOne = pageNode(1, 'Page One');
        pageTwo = pageNode(2, 'Page Two');
        mocks.rootNode = { ...pageNode(-1, 'Root'), children: [ pageOne, pageTwo ] };
        pageOne.parent = mocks.rootNode;
        pageTwo.parent = mocks.rootNode;
        mocks.currentPage = { pageId: 1, offers: [ offerOne, offerTwo ] };
        mocks.currentOffer = offerOne;
        mocks.catalogAdmin = {
            adminMode: true,
            loading: false,
            lastError: null,
            setCreatingPage: vi.fn(),
            setEditingPageNode: vi.fn(),
            setEditingRootPage: vi.fn(),
            setEditingPageData: vi.fn(),
            setEditingOffer: vi.fn(),
            reorderPage: vi.fn(),
            reorderOffers: vi.fn(),
            deletePage: vi.fn(),
            deleteOffer: vi.fn(),
            togglePageVisible: vi.fn()
        };
        mocks.studio = {
            session: {
                draftVersionId: 7,
                pages: [],
                actors: [],
                validationCurrent: true,
                validationIssueCount: 0
            },
            revision: 3,
            pendingCount: 0,
            validation: null,
            history: [],
            loading: false,
            loadHistory: vi.fn(),
            validate: vi.fn(),
            undo: vi.fn()
        };
    });

    afterEach(cleanup);

    it('follows a page selected in the normal catalog after the manager is already open', () => {
        const view = render(<CatalogAdminManagerView />);
        expect(screen.getByRole('treeitem', { name: /Page One/ })).toHaveAttribute('aria-selected', 'true');

        mocks.currentPage = { pageId: 2, offers: [] };
        view.rerender(<CatalogAdminManagerView />);

        expect(screen.getByRole('treeitem', { name: /Page Two/ })).toHaveAttribute('aria-selected', 'true');
    });

    it('highlights the offer selected in the normal catalog', () => {
        mocks.currentOffer = offerTwo;

        render(<CatalogAdminManagerView />);

        expect(screen.getByText('Offer Two').closest('.octane-catalog-admin-offer-row')).toHaveClass('is-selected');
    });

    it('updates the normal catalog when an offer is selected in the manager', () => {
        render(<CatalogAdminManagerView />);

        fireEvent.click(screen.getByText('Offer Two'));

        expect(mocks.setCurrentOffer).toHaveBeenCalledWith(offerTwo);
    });

    it('opens Edit Furni for each furniture product in a bundle', () => {
        offerTwo.products.push({
            ...offerTwo.product,
            productType: 'i',
            productClassId: 2202,
            furnitureData: { ...offerTwo.product.furnitureData, className: 'bundle_wall' }
        });
        const opened = vi.fn();
        window.addEventListener('furni-editor:open', opened);

        render(<CatalogAdminManagerView />);

        const row = screen.getByText('Offer Two').closest('.octane-catalog-admin-offer-row');
        const buttons = within(row as HTMLElement).getAllByRole('button', { name: /Edit Furni/ });
        expect(buttons).toHaveLength(2);
        fireEvent.click(buttons[1]);
        expect((opened.mock.calls[0][0] as CustomEvent).detail).toEqual({ spriteId: 2202 });

        window.removeEventListener('furni-editor:open', opened);
    });
});
