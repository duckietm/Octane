/* @vitest-environment jsdom */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogItemGridWidgetView } from './CatalogItemGridWidgetView';

const state = vi.hoisted(() => ({
    currentPage: { offers: [] as any[], pageId: 1 } as any,
    currentOffer: null as any
}));

vi.mock('../../../../../hooks', async () => {
    const { useScrollWindow } = await import('../../../../../hooks/catalog/useScrollWindow');

    return {
        useCatalogActions: () => ({ selectCatalogOffer: vi.fn(), requestOfferToMover: vi.fn() }),
        useCatalogData: () => ({ currentOffer: state.currentOffer, currentPage: state.currentPage }),
        useCatalogUiState: () => ({ currentType: 'NORMAL', setCurrentPage: vi.fn() }),
        useInventoryFurni: () => ({ isVisible: false }),
        useScrollWindow
    };
});

vi.mock('../../../CatalogAdminContext', () => ({ useCatalogAdmin: () => ({ adminMode: false, reorderOffers: vi.fn() }) }));
vi.mock('../common/CatalogOfferTileView', () => ({ CatalogOfferTileView: ({ offer }: any) => <div data-testid={`tile-${offer.offerId}`} /> }));

const makeOffers = (count: number) =>
    Array.from({ length: count }, (_, offerId) => ({ offerId, priceInCredits: 10, priceInActivityPoints: 0, product: {}, localizationId: `offer_${offerId}`, clubLevel: 0 }) as any);

const viewportOf = (container: HTMLElement) => container.querySelector('.octane-classic-scroll-area-viewport') as HTMLElement;

describe.each([30, 120])('catalogue grid scroll position (%i offers)', (count) => {
    afterEach(() => {
        cleanup();
        state.currentOffer = null;
    });

    const open = () => {
        state.currentPage = { offers: makeOffers(count), pageId: 1 };

        const view = render(<CatalogItemGridWidgetView className="octane-catalog-grid-density-standard" />);
        const viewport = viewportOf(view.container);

        viewport.scrollTop = 150;

        return { ...view, viewport };
    };

    it('stays when the first offer is chosen', () => {
        const { rerender, container, viewport } = open();

        state.currentOffer = state.currentPage.offers[count - 1];
        rerender(<CatalogItemGridWidgetView className="octane-catalog-grid-density-standard" />);

        expect(viewportOf(container)).toBe(viewport);
        expect(viewport.scrollTop).toBe(150);
    });

    it('stays when the same page arrives again as a new object', () => {
        const { rerender, container, viewport } = open();

        state.currentPage = { offers: state.currentPage.offers.map((offer: any) => ({ ...offer })), pageId: 1 };
        rerender(<CatalogItemGridWidgetView className="octane-catalog-grid-density-standard" />);

        expect(viewportOf(container)).toBe(viewport);
        expect(viewport.scrollTop).toBe(150);
    });

    // The long page is virtualised: its scroll is moved by the virtualiser, which has nothing to measure in jsdom.
    it.skipIf(count > 90)('goes back to the top for another page', () => {
        const { rerender, viewport } = open();

        state.currentPage = { offers: makeOffers(count), pageId: 2 };
        rerender(<CatalogItemGridWidgetView className="octane-catalog-grid-density-standard" />);

        expect(viewport.scrollTop).toBe(0);
    });
});
