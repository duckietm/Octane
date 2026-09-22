/* @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_CATALOG_UI_STATE, useCatalogStore } from './catalogStore';
import { useCatalogActions, useCatalogData, useCatalogUiState } from './useCatalog';

// The three filters are the public surface 45 components read. This test
// pins their key sets and the identity of the values behind them.

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(() => {
    client = new QueryClient();
    useCatalogStore.setState({ ...INITIAL_CATALOG_UI_STATE });
});

describe('useCatalog filter contract', () => {
    it('useCatalogData returns the read-only data slice', () => {
        const { result } = renderHook(() => useCatalogData(), { wrapper });

        expect(Object.keys(result.current).sort()).toEqual([
            'catalogLoadError',
            'catalogLocalizationVersion',
            'currentOffer',
            'currentPage',
            'frontPageItems',
            'furniCount',
            'furniLimit',
            'isBusy',
            'maxFurniLimit',
            'offersToNodes',
            'roomPreviewer',
            'rootNode',
            'searchResult',
            'secondsLeft',
            'secondsLeftWithGrace',
            'updateTime'
        ]);

        expect(result.current.rootNode).toBeNull();
        expect(result.current.currentPage).toBeNull();
        expect(result.current.isBusy).toBe(false);
        expect(result.current.frontPageItems).toBe(useCatalogStore.getState().frontPageItems);
    });

    it('useCatalogUiState returns the UI fields plus their setters', () => {
        const { result } = renderHook(() => useCatalogUiState(), { wrapper });

        expect(Object.keys(result.current).sort()).toEqual([
            'activeNodes',
            'catalogPlaceMultipleObjects',
            'currentType',
            'giftReceiver',
            'isVisible',
            'navigationHidden',
            'pageId',
            'previousPageId',
            'purchaseOptions',
            'setCatalogPlaceMultipleObjects',
            'setCurrentOffer',
            'setCurrentPage',
            'setGiftReceiver',
            'setIsVisible',
            'setNavigationHidden',
            'setPurchaseOptions',
            'setSearchResult'
        ]);

        expect(result.current.setIsVisible).toBe(useCatalogStore.getState().setIsVisible);
    });

    it('useCatalogActions returns the imperative actions', () => {
        const { result } = renderHook(() => useCatalogActions(), { wrapper });

        expect(Object.keys(result.current).sort()).toEqual([
            'activateNode',
            'getBuilderFurniPlaceableStatus',
            'getNodeById',
            'getNodeByName',
            'getNodesByOfferId',
            'openCatalogByType',
            'openPageById',
            'openPageByName',
            'openPageByOfferId',
            'refreshCurrentPage',
            'refreshIndex',
            'requestOfferToMover',
            'resetPlacedOfferData',
            'retryCurrentPage',
            'selectCatalogOffer',
            'toggleCatalogByType'
        ]);

        expect(result.current.activateNode).toBe(useCatalogStore.getState().activateNode);
    });

    it('a consumer of one slice does not re-render when another slice changes', () => {
        let renders = 0;
        renderHook(
            () => {
                renders++;

                return useCatalogActions();
            },
            { wrapper }
        );

        const before = renders;
        useCatalogStore.getState().setBuildersClubFurniCount(42);

        expect(renders).toBe(before);
    });
});
