/* @vitest-environment jsdom */
import { GetSessionDataManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogNode, CatalogType, SearchResult } from '../../../../../api';
import { CatalogSearchView } from './CatalogSearchView';

const state = vi.hoisted(() => ({
    rootNode: null as any,
    searchResult: null as any,
    currentType: 'NORMAL',
    beginCatalogSearch: null as any,
    endCatalogSearch: null as any,
    cachedOffers: null as Map<number, any> | null
}));

vi.mock('../../../../../hooks', () => ({
    useCatalogData: () => ({ rootNode: state.rootNode, searchResult: state.searchResult }),
    useCatalogUiState: () => ({ currentType: state.currentType }),
    useCatalogActions: () => ({ beginCatalogSearch: state.beginCatalogSearch, endCatalogSearch: state.endCatalogSearch })
}));

vi.mock('../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../api')>()),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../../hooks/catalog/useCatalogQueries', () => ({
    readCatalogIndex: () => ({ offersToNodes: new Map([[42, [state.rootNode.children[0]]], [50, [state.rootNode.children[0]]]]) }),
    readCachedCatalogOffer: (_type: string, offerId: number) => state.cachedOffers?.get(offerId) ?? null
}));

const buildRoot = () => {
    const root = new CatalogNode({ visible: true, icon: 0, pageId: -1, parentId: -1, pageName: 'root', localization: 'root', children: [], offerIds: [] } as any, 0, null);
    const page = new CatalogNode({ visible: true, icon: 0, pageId: 7, parentId: -1, pageName: 'chairs', localization: 'Chairs', children: [], offerIds: [42] } as any, 1, root);

    root.addChild(page);

    return root;
};

const chair = { type: 's', id: 1, name: 'Royal Chair', className: 'chair_royal', fullName: 'chair_royal', purchaseOfferId: 42, rentOfferId: 43, bcOfferId: 50, availableForBuildersClub: true, excludeDynamic: false, furniLine: '' };

const input = () => screen.getByRole('textbox', { name: 'catalog.search' });

beforeEach(() => {
    vi.useFakeTimers();
    state.rootNode = buildRoot();
    state.searchResult = null;
    state.currentType = CatalogType.NORMAL;
    state.beginCatalogSearch = vi.fn();
    state.endCatalogSearch = vi.fn();
    vi.mocked(GetSessionDataManager).mockReturnValue({ getAllFurnitureData: () => [chair], getProductData: (): null => null } as any);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.mocked(GetSessionDataManager).mockReset();
});

describe('CatalogSearchView', () => {
    it('searches 50 ms after the third character and buys the purchase offer, not the rent offer', () => {
        render(<CatalogSearchView />);

        fireEvent.change(input(), { target: { value: 'roy' } });
        expect(state.beginCatalogSearch).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(50));

        const [result, page] = state.beginCatalogSearch.mock.calls[0];
        expect(result.searchValue).toBe('roy');
        expect(result.offers.map((offer: any) => [offer.offerId, offer.isRentOffer])).toEqual([[42, false]]);
        expect(result.filteredNodes.map((row: any) => row.node.pageId)).toEqual([7]);
        expect(page.pageId).toBe(-1);
        expect(page.catalogType).toBe(CatalogType.NORMAL);
    });

    it("uses a loaded page's own offer for a result, so a limited edition keeps its numbers", () => {
        const cached = { offerId: 42, clone: () => ({ offerId: 42, isRentOffer: false, product: { uniqueLimitedItemSeriesSize: 50 } }) };
        state.cachedOffers = new Map([[42, cached]]);
        render(<CatalogSearchView />);

        fireEvent.change(input(), { target: { value: 'roy' } });
        act(() => vi.advanceTimersByTime(50));

        expect(state.beginCatalogSearch.mock.calls[0][0].offers[0].product.uniqueLimitedItemSeriesSize).toBe(50);
        state.cachedOffers = null;
    });

    it('uses the Builders Club offer in the Builders Club catalogue', () => {
        state.currentType = CatalogType.BUILDER;
        render(<CatalogSearchView />);

        fireEvent.change(input(), { target: { value: 'royal' } });
        act(() => vi.advanceTimersByTime(50));

        expect(state.beginCatalogSearch.mock.calls[0][0].offers.map((offer: any) => offer.offerId)).toEqual([50]);
    });

    it('searches shorter text on Enter', () => {
        render(<CatalogSearchView />);

        fireEvent.change(input(), { target: { value: 'ro' } });
        act(() => vi.advanceTimersByTime(50));
        expect(state.beginCatalogSearch).not.toHaveBeenCalled();

        fireEvent.keyDown(input(), { key: 'Enter' });
        expect(state.beginCatalogSearch).toHaveBeenCalledTimes(1);
    });

    it('does not search after the view is gone', () => {
        const { unmount } = render(<CatalogSearchView />);

        fireEvent.change(input(), { target: { value: 'royal' } });
        unmount();
        act(() => vi.advanceTimersByTime(100));

        expect(state.beginCatalogSearch).not.toHaveBeenCalled();
    });

    it('ends the search when the field is emptied or cleared, and focuses the field', () => {
        render(<CatalogSearchView />);

        fireEvent.change(input(), { target: { value: 'royal' } });
        fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

        expect(state.endCatalogSearch).toHaveBeenCalledTimes(1);
        expect(input()).toHaveValue('');
        expect(document.activeElement).toBe(input());

        act(() => vi.advanceTimersByTime(100));
        expect(state.beginCatalogSearch).not.toHaveBeenCalled();
    });

    it('shows the running search again when the catalog reopens, without searching again', () => {
        state.searchResult = new SearchResult('royal', [], []);
        render(<CatalogSearchView />);

        expect(input()).toHaveValue('royal');
        act(() => vi.advanceTimersByTime(100));
        expect(state.beginCatalogSearch).not.toHaveBeenCalled();
    });

    it('empties the field when the search ends elsewhere (a tab, a link)', () => {
        state.searchResult = new SearchResult('royal', [], []);
        const { rerender } = render(<CatalogSearchView />);

        state.searchResult = null;
        rerender(<CatalogSearchView />);

        expect(input()).toHaveValue('');
    });

    it('drops a pending search when the catalogue type changes', () => {
        const { rerender } = render(<CatalogSearchView />);

        fireEvent.change(input(), { target: { value: 'royal' } });
        state.currentType = CatalogType.BUILDER;
        state.rootNode = buildRoot();
        rerender(<CatalogSearchView />);
        act(() => vi.advanceTimersByTime(100));

        expect(state.beginCatalogSearch).not.toHaveBeenCalled();
        expect(input()).toHaveValue('');
    });
});
