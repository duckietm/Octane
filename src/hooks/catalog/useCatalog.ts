import { useShallow } from 'zustand/react/shallow';
import { useCatalogStore } from './catalogStore';
import { useCatalogIndexQuery, useCatalogPageQuery } from './useCatalogQueries';

export { CatalogEffectsHost } from './useCatalogEffects';

/**
 * Read-only slice of server-driven catalog state. The page tree and the
 * current page come from the TanStack cache; the rest is store state.
 * A consumer re-renders only when one of the returned values changes.
 */
export const useCatalogData = () => {
    const ui = useCatalogStore(
        useShallow((state) => ({
            currentType: state.currentType,
            pageId: state.pageId,
            isVisible: state.isVisible,
            pageOverride: state.pageOverride,
            currentOffer: state.currentOffer,
            frontPageItems: state.frontPageItems,
            searchResult: state.searchResult,
            roomPreviewer: state.roomPreviewer,
            catalogLocalizationVersion: state.catalogLocalizationVersion,
            furniCount: state.furniCount,
            furniLimit: state.furniLimit,
            maxFurniLimit: state.maxFurniLimit,
            secondsLeft: state.secondsLeft,
            secondsLeftWithGrace: state.secondsLeftWithGrace,
            updateTime: state.updateTime
        }))
    );
    const indexQuery = useCatalogIndexQuery(ui.currentType, ui.isVisible);
    const pageQuery = useCatalogPageQuery(ui.currentType, ui.pageId, ui.isVisible);

    const currentPage = ui.pageOverride ?? pageQuery.data?.page ?? null;
    const isBusy = pageQuery.isFetching && (pageQuery.isPlaceholderData || !pageQuery.data);
    const catalogLoadError: 'timeout' | null = pageQuery.isError && !pageQuery.isFetching ? 'timeout' : null;

    return {
        isBusy,
        catalogLoadError,
        rootNode: indexQuery.data?.rootNode ?? null,
        offersToNodes: indexQuery.data?.offersToNodes ?? null,
        currentPage,
        currentOffer: ui.currentOffer,
        frontPageItems: ui.frontPageItems,
        searchResult: ui.searchResult,
        roomPreviewer: ui.roomPreviewer,
        catalogLocalizationVersion: ui.catalogLocalizationVersion,
        furniCount: ui.furniCount,
        furniLimit: ui.furniLimit,
        maxFurniLimit: ui.maxFurniLimit,
        secondsLeft: ui.secondsLeft,
        secondsLeftWithGrace: ui.secondsLeftWithGrace,
        updateTime: ui.updateTime
    };
};

/**
 * UI-side state owned by the catalog overlay: visibility, the rendered
 * page id and breadcrumb, search result, purchase options, multi-place
 * toggle, plus the setters that write the data slice from the UI.
 */
export const useCatalogUiState = () =>
    useCatalogStore(
        useShallow((state) => ({
            isVisible: state.isVisible,
            setIsVisible: state.setIsVisible,
            pageId: state.pageId,
            previousPageId: state.previousPageId,
            currentType: state.currentType,
            activeNodes: state.activeNodes,
            navigationHidden: state.navigationHidden,
            setNavigationHidden: state.setNavigationHidden,
            purchaseOptions: state.purchaseOptions,
            setPurchaseOptions: state.setPurchaseOptions,
            giftReceiver: state.giftReceiver,
            setGiftReceiver: state.setGiftReceiver,
            catalogPlaceMultipleObjects: state.catalogPlaceMultipleObjects,
            setCatalogPlaceMultipleObjects: state.setCatalogPlaceMultipleObjects,
            setCurrentPage: state.setCurrentPage,
            setCurrentOffer: state.setCurrentOffer,
            setSearchResult: state.setSearchResult
        }))
    );

/**
 * Imperative actions: open / toggle the catalog, navigate the tree, send
 * an offer to the mover, look up nodes, run the Builders Club placement
 * check. All are stable references from the store.
 */
export const useCatalogActions = () =>
    useCatalogStore(
        useShallow((state) => ({
            openCatalogByType: state.openCatalogByType,
            toggleCatalogByType: state.toggleCatalogByType,
            activateNode: state.activateNode,
            openPageById: state.openPageById,
            openPageByName: state.openPageByName,
            openPageByOfferId: state.openPageByOfferId,
            requestOfferToMover: state.requestOfferToMover,
            selectCatalogOffer: state.selectCatalogOffer,
            getNodeById: state.getNodeById,
            getNodeByName: state.getNodeByName,
            getNodesByOfferId: state.getNodesByOfferId,
            getBuilderFurniPlaceableStatus: state.getBuilderFurniPlaceableStatus,
            resetPlacedOfferData: state.resetPlacedOfferData,
            retryCurrentPage: state.retryCurrentPage,
            refreshIndex: state.refreshIndex,
            refreshCurrentPage: state.refreshCurrentPage
        }))
    );
