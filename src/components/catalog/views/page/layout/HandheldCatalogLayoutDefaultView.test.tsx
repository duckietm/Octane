/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../../api/handheld/handheldLayout';
import { HandheldCatalogPageContext } from '../../../../../hooks/catalog/handheldCatalogPageContext';
import { useHandheldStore } from '../../../../../state/handheldStore';

const state = vi.hoisted(() => ({ data: {} as any, quantity: 1, select: null as any }));

vi.mock('../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    GetProductIconUrl: () => 'icon.png',
    LocalizeText: (key: string) => key,
    SanitizeHotelHtml: (value: string) => value
}));
vi.mock('../../../../../hooks', () => ({
    useCatalogData: () => state.data,
    useCatalogUiState: () => ({ currentType: 'NORMAL', purchaseOptions: { quantity: state.quantity } }),
    useCatalogActions: () => ({ selectCatalogOffer: state.select }),
    useCatalogDisplayPreferences: () => ({ showTilePrices: true }),
    useCatalogBundleDiscountRuleset: () => ({ data: null })
}));
vi.mock('../widgets/CatalogViewProductWidgetView', () => ({ CatalogViewProductWidgetView: () => <div data-testid="preview" /> }));
vi.mock('../widgets/CatalogPreviewControls', () => ({ CatalogPreviewControls: () => <div data-testid="preview-controls" /> }));
vi.mock('../widgets/CatalogAddOnBadgeWidgetView', () => ({ CatalogAddOnBadgeWidgetView: () => null }));
vi.mock('../widgets/CatalogAddOnChatStyleWidgetView', () => ({ CatalogAddOnChatStyleWidgetView: () => null }));
vi.mock('../widgets/CatalogLimitedItemWidgetView', () => ({ CatalogLimitedItemWidgetView: () => <div data-testid="limited" /> }));
vi.mock('../widgets/CatalogSpinnerWidgetView', () => ({ CatalogSpinnerWidgetView: () => <div data-testid="stepper" /> }));
vi.mock('../widgets/CatalogPurchaseWidgetView', () => ({ CatalogPurchaseWidgetView: () => <button type="button">buy</button> }));

import { HANDHELD_CATALOG_GRID_BATCH } from '../widgets/HandheldCatalogGridView';
import { HandheldCatalogLayoutDefaultView } from './HandheldCatalogLayoutDefaultView';

const offer = (index: number, extra: Record<string, unknown> = {}) => ({
    offerId: 100 + index,
    pricingModel: 'pricing_model_single',
    priceInCredits: 5 + index,
    priceInActivityPoints: 0,
    activityPointType: 0,
    clubLevel: 0,
    bundlePurchaseAllowed: true,
    localizationName: `item ${index}`,
    localizationDescription: `about ${index}`,
    product: { productType: 's', productClassId: index, productCount: 1, uniqueLimitedItemSeriesSize: 0, uniqueLimitedItemsLeft: 0 },
    ...extra
});

const offers = [offer(0), offer(1, { priceInActivityPoints: 20, activityPointType: 5 }), offer(2, { product: { productType: 's', productClassId: 2, productCount: 1, uniqueLimitedItemSeriesSize: 50, uniqueLimitedItemsLeft: 0 } })];
const page = { pageId: 7, layoutCode: 'default_3x3', offers, localization: { getText: () => 'Teaser of the page', getImage: () => '' } } as any;
const onBack = vi.fn();

const renderLayout = () =>
    render(
        <HandheldCatalogPageContext value={{ pageTitle: 'Cinema', backLabel: 'Furni', onBack }}>
            <HandheldCatalogLayoutDefaultView hideNavigation={() => {}} page={page} />
        </HandheldCatalogPageContext>
    );

const tiles = () => screen.getAllByRole('option');

beforeEach(() => {
    onBack.mockClear();
    state.quantity = 1;
    state.data = { currentOffer: null, currentPage: page, roomPreviewer: null };
    state.select = vi.fn((chosen: unknown) => {
        state.data = { ...state.data, currentOffer: chosen };
    });
    act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('HandheldCatalogLayoutDefaultView', () => {
    it('shows the grid with the strip and the page teaser while nothing is chosen', () => {
        renderLayout();

        expect(tiles()).toHaveLength(3);
        expect(screen.getByRole('heading')).toHaveTextContent('Cinema');
        expect(screen.getByText('Teaser of the page')).toBeInTheDocument();
        expect(screen.queryByTestId('preview')).toBeNull();
        expect(screen.queryByRole('button', { name: 'buy' })).toBeNull();
        expect(tiles()[1]).toHaveTextContent('620');
        expect(tiles()[2]).toHaveTextContent('LTD');
        expect(tiles()[2]).toHaveClass('is-sold-out');
    });

    it('chooses an offer with a tap and keeps it chosen while the grid is browsed', () => {
        const view = renderLayout();

        fireEvent.click(tiles()[1]);

        expect(state.select).toHaveBeenCalledWith(offers[1]);

        view.rerender(
            <HandheldCatalogPageContext value={{ pageTitle: 'Cinema', backLabel: 'Furni', onBack }}>
                <HandheldCatalogLayoutDefaultView hideNavigation={() => {}} page={page} />
            </HandheldCatalogPageContext>
        );

        expect(tiles()[1]).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('heading')).toHaveTextContent('item 1');

        fireEvent.scroll(document.querySelector('.octane-handheld-shop__grid-scroll') as HTMLElement, { target: { scrollTop: 300 } });

        expect(tiles()[1]).toHaveAttribute('aria-selected', 'true');
        expect(tiles()[0]).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('heading')).toHaveTextContent('item 1');
    });

    it('puts the preview, its controls, the price, the stepper and the buy buttons in the product panel', () => {
        state.data = { ...state.data, currentOffer: offers[1] };
        state.quantity = 3;
        renderLayout();

        const panel = document.querySelector('.octane-handheld-shop__product') as HTMLElement;

        expect(panel).toContainElement(screen.getByTestId('preview'));
        expect(panel).toContainElement(screen.getByTestId('preview-controls'));
        expect(panel).toContainElement(screen.getByTestId('limited'));
        expect(panel).toContainElement(screen.getByTestId('stepper'));
        expect(panel).toContainElement(screen.getByRole('button', { name: 'buy' }));
        expect(screen.getByText('about 1')).toBeInTheDocument();
        // 3 x 6 credits and 3 x 20 of the activity currency.
        expect([...panel.querySelectorAll('.octane-handheld-shop__price-amount')].map((entry) => entry.textContent)).toEqual(['18', '60']);
        // The grid comes before the panel in the flow: its scroll area ends where the panel begins.
        expect(panel.previousElementSibling).toHaveClass('octane-handheld-shop__grid-scroll');
    });

    it('goes back to the list of pages from the strip and folds the preview away', () => {
        state.data = { ...state.data, currentOffer: offers[0] };
        renderLayout();

        fireEvent.click(screen.getByRole('button', { name: 'Back to Furni' }));

        expect(onBack).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Hide the preview' }));

        expect(screen.queryByTestId('preview')).toBeNull();
        expect(screen.getByRole('button', { name: 'buy' })).toBeInTheDocument();

        // On its side the panel has a column of its own: the preview is always there.
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'landscape' } }));

        expect(screen.getByTestId('preview')).toBeInTheDocument();
    });

    it('draws a long page a batch at a time as its end comes near', () => {
        const many = Array.from({ length: HANDHELD_CATALOG_GRID_BATCH + 40 }, (_, index) => offer(index));

        state.data = { currentOffer: null, currentPage: { ...page, offers: many }, roomPreviewer: null };
        renderLayout();

        expect(tiles()).toHaveLength(HANDHELD_CATALOG_GRID_BATCH);

        fireEvent.scroll(document.querySelector('.octane-handheld-shop__grid-scroll') as HTMLElement);

        expect(tiles()).toHaveLength(HANDHELD_CATALOG_GRID_BATCH + 40);
    });
});
