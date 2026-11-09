import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCatalogData } from '../../../../../hooks';
import { CatalogLayoutBadgeDisplayView } from './CatalogLayoutBadgeDisplayView';

vi.mock('../../../../../api', () => ({
    LocalizeText: (key: string) => key,
    SanitizeHtml: (value: string) => value
}));

vi.mock('../../../../../common', () => ({
    Column: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Grid: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Text: ({ children, dangerouslySetInnerHTML, ...props }: any) => (
        <span {...props} dangerouslySetInnerHTML={dangerouslySetInnerHTML}>
            {children}
        </span>
    )
}));

vi.mock('../../../../../hooks', () => ({ useCatalogData: vi.fn() }));

vi.mock('../widgets/CatalogBadgeSelectorWidgetView', () => ({
    CatalogBadgeSelectorWidgetView: () => <div data-testid="badge-selector" />
}));
vi.mock('../widgets/CatalogFirstProductSelectorWidgetView', () => ({ CatalogFirstProductSelectorWidgetView: () => null }));
vi.mock('../widgets/CatalogItemGridWidgetView', () => ({
    CatalogItemGridWidgetView: ({ columnCount, columnMinHeight, columnMinWidth }: any) => (
        <div data-column-count={columnCount} data-column-height={columnMinHeight} data-column-width={columnMinWidth} data-testid="offer-grid" />
    )
}));
vi.mock('../widgets/CatalogLimitedItemWidgetView', () => ({ CatalogLimitedItemWidgetView: () => <div data-testid="limited-item" /> }));
vi.mock('../widgets/CatalogPreviewControls', () => ({ CatalogPreviewControls: () => <div data-testid="preview-controls" /> }));
vi.mock('../widgets/CatalogProductDetailsView', () => ({
    CatalogProductDetailsView: ({ offer }: any) => (
        <div data-testid="product-details">
            {offer.localizationName} {offer.localizationDescription}
        </div>
    )
}));
vi.mock('../widgets/CatalogPurchaseWidgetView', () => ({ CatalogPurchaseWidgetView: () => <div data-testid="purchase" /> }));
vi.mock('../widgets/CatalogTotalPriceWidget', () => ({ CatalogTotalPriceWidget: () => <div data-testid="total-price" /> }));
vi.mock('../widgets/CatalogViewProductWidgetView', () => ({
    CatalogViewProductWidgetView: ({ height }: any) => <div data-height={height} data-testid="product-preview" />
}));

const page = {
    localization: {
        getImage: () => 'intro.png',
        getText: () => 'Choose a badge display'
    }
} as any;

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCatalogData).mockReturnValue({ currentOffer: null } as any);
});

describe('badge display catalog layout', () => {
    it('renders dedicated product, badge, preview and purchase regions', () => {
        render(<CatalogLayoutBadgeDisplayView page={page} hideNavigation={() => undefined} />);

        const layout = document.querySelector('.octane-catalog-badge-display-layout');

        expect(layout).toBeInTheDocument();
        expect(layout.querySelector('.octane-catalog-badge-product-picker')).toContainElement(screen.getByTestId('offer-grid'));
        expect(layout.querySelector('.octane-catalog-badge-picker')).toContainElement(screen.getByTestId('badge-selector'));
        expect(layout.querySelector('.octane-catalog-badge-preview')).toBeInTheDocument();
        expect(layout.querySelector('.octane-catalog-badge-purchase')).toBeInTheDocument();
        expect(screen.getByTestId('offer-grid')).toHaveAttribute('data-column-count', '1');
        expect(screen.getByTestId('offer-grid')).toHaveAttribute('data-column-height', '70');
        expect(screen.getByTestId('offer-grid')).toHaveAttribute('data-column-width', '70');
    });

    it('shows the page introduction until a product is available', () => {
        render(<CatalogLayoutBadgeDisplayView page={page} hideNavigation={() => undefined} />);

        expect(screen.getByAltText('')).toHaveAttribute('src', 'intro.png');
        expect(screen.getByText('Choose a badge display')).toBeInTheDocument();
        expect(screen.queryByTestId('product-preview')).not.toBeInTheDocument();
    });

    it('shows the selected product preview, limited data, price and purchase controls', () => {
        vi.mocked(useCatalogData).mockReturnValue({
            currentOffer: {
                localizationDescription: 'Display your badge',
                localizationName: 'Badge Cabinet',
                product: { productType: 's' }
            },
            roomPreviewer: {}
        } as any);

        render(<CatalogLayoutBadgeDisplayView page={page} hideNavigation={() => undefined} />);

        expect(screen.getByTestId('product-preview')).toBeInTheDocument();
        expect(screen.getByTestId('preview-controls')).toBeInTheDocument();
        expect(screen.getByTestId('product-details')).toBeInTheDocument();
        expect(screen.getByTestId('limited-item')).toBeInTheDocument();
        expect(screen.getByText(/Badge Cabinet Display your badge/)).toBeInTheDocument();
        expect(screen.getByTestId('product-preview')).toHaveAttribute('data-height', '240');
        expect(screen.getByTestId('total-price')).toBeInTheDocument();
        expect(screen.getByTestId('total-price').closest('.octane-catalog-preview-price')).toBeInTheDocument();
        expect(screen.getByTestId('total-price').closest('.octane-catalog-price-frame')).toBeInTheDocument();
        expect(screen.getByTestId('purchase')).toBeInTheDocument();
    });
});
