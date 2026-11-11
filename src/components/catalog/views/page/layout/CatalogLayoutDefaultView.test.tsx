import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCatalogData, useCatalogDisplayPreferences, useCatalogUiState } from '../../../../../hooks';
import { CatalogLayoutDefaultView } from './CatalogLayoutDefaultView';

vi.mock('../../../../../api', () => ({
    CatalogType: { NORMAL: 'NORMAL', BUILDER: 'BUILDERS_CLUB' },
    GetConfigurationValue: vi.fn((key: string) => key === 'catalog.multiple.purchase.enabled'),
    LocalizeText: (key: string) => key,
    ProductTypeEnum: { BADGE: 'b', FLOOR: 's' },
    SanitizeHtml: (value: string) => value
}));

vi.mock('../../../../../common', () => ({ Text: () => null }));

const activateNode = vi.hoisted(() => vi.fn());
const admin = vi.hoisted(() => ({ mode: false }));

vi.mock('../../../../../hooks', () => ({
    getCatalogGridMetrics: () => ({}),
    useCatalogData: vi.fn(),
    useCatalogDisplayPreferences: vi.fn(),
    useCatalogActions: vi.fn(() => ({ activateNode })),
    useCatalogUiState: vi.fn(() => ({ currentType: 'NORMAL' }))
}));

vi.mock('../../../CatalogAdminContext', () => ({ useCatalogAdmin: () => ({ adminMode: admin.mode }) }));
vi.mock('../../catalog-icon/CatalogIconView', () => ({ CatalogIconView: () => null }));

vi.mock('../../catalog-header/CatalogHeaderView', () => ({ CatalogHeaderView: () => null }));
vi.mock('../widgets/CatalogAddOnBadgeWidgetView', () => ({ CatalogAddOnBadgeWidgetView: () => null }));
vi.mock('../widgets/CatalogItemGridWidgetView', () => ({ CatalogItemGridWidgetView: () => null }));
vi.mock('../widgets/CatalogLimitedItemWidgetView', () => ({ CatalogLimitedItemWidgetView: () => null }));
vi.mock('../widgets/CatalogPreviewControls', () => ({ CatalogPreviewControls: () => null }));
vi.mock('../widgets/CatalogProductDetailsView', () => ({ CatalogProductDetailsView: () => null }));
vi.mock('../widgets/CatalogPurchaseSelectionPrompt', () => ({ CatalogPurchaseSelectionPrompt: () => null }));
vi.mock('../widgets/CatalogPurchaseWidgetView', () => ({ CatalogPurchaseWidgetView: () => null }));
vi.mock('../widgets/CatalogSpinnerWidgetView', () => ({ CatalogSpinnerWidgetView: () => null }));
vi.mock('../widgets/CatalogTotalPriceWidget', () => ({ CatalogTotalPriceWidget: () => null }));
vi.mock('../widgets/CatalogViewProductWidgetView', () => ({ CatalogViewProductWidgetView: () => null }));

const page = {
    localization: {
        getImage: () => '',
        getText: () => ''
    }
};

afterEach(cleanup);

beforeEach(() => {
    vi.mocked(useCatalogDisplayPreferences).mockReturnValue({ density: 'standard', showTilePrices: true } as any);
    vi.mocked(useCatalogData).mockReturnValue({
        currentOffer: { product: { productType: 's' } },
        currentPage: page,
        roomPreviewer: null
    } as any);
});

describe('default catalog layout', () => {
    it('lets the product preview fill the exact 360px AIR region', () => {
        const view = render(<CatalogLayoutDefaultView hideNavigation={() => undefined} page={page as any} />);
        const preview = view.container.querySelector<HTMLElement>('.octane-catalog-offer-preview');

        expect(preview).not.toBeNull();
        expect(preview.style.width).toBe('100%');
        expect(preview.style.minWidth).toBe('0px');
        expect(preview.style.flexGrow).toBe('1');
    });

    describe('a heading page', () => {
        const children = [
            { pageId: 26, pageName: 'chests', localization: 'Chests', iconId: 1, isVisible: true, children: [] },
            { pageId: 27, pageName: 'bots', localization: 'Bots', iconId: 2, isVisible: true, children: [] }
        ];
        const headingPage = { ...page, pageId: 25, offers: [] };

        beforeEach(() => {
            admin.mode = false;
            activateNode.mockClear();
            vi.mocked(useCatalogUiState).mockReturnValue({ currentType: 'NORMAL', activeNodes: [{ pageId: 25, isVisible: true, children }] } as any);
        });

        it('lists its sub-pages instead of an empty grid and opens the one clicked', () => {
            const view = render(<CatalogLayoutDefaultView hideNavigation={() => undefined} page={headingPage as any} />);

            expect(view.container.querySelector('.octane-catalog-default-layout')).toBeNull();
            expect(view.getAllByRole('listitem')).toHaveLength(2);

            fireEvent.click(view.getByText('Bots'));

            expect(activateNode).toHaveBeenCalledWith(children[1]);
        });

        it('keeps the grid for staff editing the catalogue', () => {
            admin.mode = true;

            const view = render(<CatalogLayoutDefaultView hideNavigation={() => undefined} page={headingPage as any} />);

            expect(view.container.querySelector('.octane-catalog-category-index')).toBeNull();
            expect(view.container.querySelector('.octane-catalog-default-layout')).not.toBeNull();
        });
    });
});
