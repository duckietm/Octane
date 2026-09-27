/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogPage, CatalogType, PageLocalization } from '../../../../api';
import { useCatalogData } from '../../../../hooks';
import {
    bindCatalogQueryClient,
    buildPurchasableOffer,
    catalogPageKey,
    CatalogPageData,
    setCachedCatalogPageOffers
} from '../../../../hooks/catalog/useCatalogQueries';
import { INITIAL_CATALOG_UI_STATE, useCatalogStore } from '../../../../hooks/catalog/catalogStore';

vi.mock('../../../../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../api')>();

    return {
        ...actual,
        GetProductDataForLocalization: () => ({ id: 1 }),
        GetFurnitureData: () => ({ className: 'chair', id: 10 })
    };
});

const productData = { id: 1, name: 'chair' } as any;
const furnitureData = { className: 'chair', id: 10 } as any;
const lookups = {
    getProductData: () => productData,
    getFurnitureData: () => furnitureData
};

const parserProduct = (overrides: Partial<Record<string, unknown>> = {}) => ({
    productType: 's',
    furniClassId: 10,
    extraParam: '',
    productCount: 1,
    uniqueLimitedItem: false,
    uniqueLimitedSeriesSize: 0,
    uniqueLimitedItemsLeft: 0,
    ...overrides
});

const parserOffer = (offerId: number, overrides: Partial<Record<string, unknown>> = {}) => ({
    offerId,
    localizationId: `offer_${offerId}`,
    rent: false,
    priceCredits: 3,
    priceActivityPoints: 0,
    priceActivityPointsType: 0,
    giftable: true,
    clubLevel: 0,
    products: [parserProduct()],
    bundlePurchaseAllowed: false,
    itemIds: '',
    haveOffer: false,
    ...overrides
});

let client: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const offerIds = (offers: { offerId: number }[]) => offers.map((offer) => offer.offerId);

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    bindCatalogQueryClient(client);
    useCatalogStore.setState({ ...INITIAL_CATALOG_UI_STATE });
});

afterEach(() => {
    cleanup();
    bindCatalogQueryClient(null);
    vi.clearAllMocks();
});

describe('catalog admin reorder writes the cache instead of an override', () => {
    it('reorders the cached page in place and leaves pageOverride untouched', async () => {
        const a = buildPurchasableOffer(parserOffer(1), lookups);
        const b = buildPurchasableOffer(parserOffer(2), lookups);
        const page = new CatalogPage(3, 'default_3x3', new PageLocalization([], []), [a, b], false);
        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 3), { page, frontPageItems: [], offerId: -1 });
        useCatalogStore.setState({ isVisible: true, pageId: 3, currentType: CatalogType.NORMAL });

        const { result } = renderHook(() => useCatalogData(), { wrapper });

        expect(offerIds(result.current.currentPage?.offers ?? [])).toEqual([1, 2]);

        act(() => {
            expect(setCachedCatalogPageOffers(CatalogType.NORMAL, 3, [b, a])).toBe(true);
        });

        await waitFor(() => expect(offerIds(result.current.currentPage?.offers ?? [])).toEqual([2, 1]));
        expect(useCatalogStore.getState().pageOverride).toBeNull();

        const serverPage = new CatalogPage(3, 'default_3x3', new PageLocalization([], []), [a], false);
        act(() => {
            client.setQueryData<CatalogPageData>(catalogPageKey(CatalogType.NORMAL, 3), { page: serverPage, frontPageItems: [], offerId: -1 });
        });

        await waitFor(() => expect(offerIds(result.current.currentPage?.offers ?? [])).toEqual([1]));
    });

    it('documents the stale-override defect: the old setCurrentPage path shadows the server page until refreshCurrentPage clears it', async () => {
        const a = buildPurchasableOffer(parserOffer(1), lookups);
        const b = buildPurchasableOffer(parserOffer(2), lookups);
        const page = new CatalogPage(3, 'default_3x3', new PageLocalization([], []), [a, b], false);
        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 3), { page, frontPageItems: [], offerId: -1 });
        useCatalogStore.setState({ isVisible: true, pageId: 3, currentType: CatalogType.NORMAL });

        const { result } = renderHook(() => useCatalogData(), { wrapper });

        expect(offerIds(result.current.currentPage?.offers ?? [])).toEqual([1, 2]);

        const reordered = new CatalogPage(3, 'default_3x3', new PageLocalization([], []), [b, a], false);
        act(() => {
            useCatalogStore.getState().setCurrentPage(reordered);
        });

        expect(offerIds(result.current.currentPage?.offers ?? [])).toEqual([2, 1]);

        const serverPage = new CatalogPage(3, 'default_3x3', new PageLocalization([], []), [a], false);
        act(() => {
            client.setQueryData<CatalogPageData>(catalogPageKey(CatalogType.NORMAL, 3), { page: serverPage, frontPageItems: [], offerId: -1 });
        });

        // Defect: the stale local override still wins over the fresh server page.
        expect(offerIds(result.current.currentPage?.offers ?? [])).toEqual([2, 1]);

        act(() => {
            useCatalogStore.getState().refreshCurrentPage();
        });

        expect(useCatalogStore.getState().pageOverride).toBeNull();
        await waitFor(() => expect(offerIds(result.current.currentPage?.offers ?? [])).toEqual([1]));
    });
});
