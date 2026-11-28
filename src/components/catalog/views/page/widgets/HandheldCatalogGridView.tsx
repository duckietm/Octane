import { FC, UIEvent, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { CatalogType, IPurchasableOffer, localizeWithFallback } from '../../../../../api';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { useCatalogStore } from '../../../../../hooks/catalog/catalogStore';
import { HandheldCatalogOfferTileView } from '../common/HandheldCatalogOfferTileView';

/** How many tiles a long page (or a long list of search results) draws at first, and adds each time its end comes near. */
export const HANDHELD_CATALOG_GRID_BATCH = 120;

/**
 * Phone catalogue: the item grid of a page, a plain scrolling grid of tiles (the stylesheet fits six of them across a
 * phone held upright). The chosen tile stays chosen while the grid is browsed. A long page is drawn a batch at a
 * time as its end comes near; the grid goes back to the top only when another page is opened, and an offer chosen by
 * a link is brought into view.
 */
export const HandheldCatalogGridView: FC<{ showPrices?: boolean }> = ({ showPrices = true }) => {
    const { currentOffer = null, currentPage = null } = useCatalogData();
    const { selectCatalogOffer = null } = useCatalogActions();
    const { currentType = CatalogType.NORMAL } = useCatalogUiState();
    const revealOffer = useCatalogStore((state) => state.revealOffer);
    const scrollRef = useRef<HTMLDivElement>(null);
    const revealedNonceRef = useRef(0);
    const [limit, setLimit] = useState(HANDHELD_CATALOG_GRID_BATCH);
    const offers = currentPage?.offers ?? [];
    // A page refetched in place keeps its spot; a search result has no page id, so there the result itself is the key.
    const pageKey = currentPage && currentPage.pageId > -1 ? `${currentType}:${currentPage.pageId}` : currentPage;
    const revealIndex = revealOffer ? offers.findIndex((offer) => offer.offerId === revealOffer.offerId) : -1;
    const revealNonce = revealOffer?.nonce ?? 0;
    const shownLimit = Math.max(limit, revealIndex + 1);

    useLayoutEffect(() => {
        setLimit(HANDHELD_CATALOG_GRID_BATCH);

        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [pageKey]);

    useLayoutEffect(() => {
        if (revealIndex < 0 || revealedNonceRef.current === revealNonce) return;

        const tile = scrollRef.current?.querySelector<HTMLElement>(`[data-offer-index="${revealIndex}"]`);

        if (!tile) return;

        tile.scrollIntoView?.({ block: 'center' });
        revealedNonceRef.current = revealNonce;
    }, [revealIndex, revealNonce]);

    const onScroll = (event: UIEvent<HTMLDivElement>) => {
        const element = event.currentTarget;

        if (shownLimit >= offers.length || element.scrollTop + element.clientHeight < element.scrollHeight - 320) return;

        setLimit(shownLimit + HANDHELD_CATALOG_GRID_BATCH);
    };

    const select = useCallback((offer: IPurchasableOffer) => selectCatalogOffer?.(offer), [selectCatalogOffer]);

    return (
        <div ref={scrollRef} className="octane-handheld-shop__grid-scroll" onScroll={onScroll}>
            <div aria-label={localizeWithFallback('octane.catalog.catalog_items', 'Catalog items')} className="octane-handheld-shop__grid" role="listbox">
                {offers.slice(0, shownLimit).map((offer, index) => (
                    <HandheldCatalogOfferTileView
                        key={offer.offerId}
                        currentType={currentType}
                        index={index}
                        isActive={!!currentOffer && currentOffer.offerId === offer.offerId}
                        offer={offer}
                        showPrices={showPrices}
                        onSelect={select}
                    />
                ))}
            </div>
        </div>
    );
};
