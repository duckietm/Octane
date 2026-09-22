import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { CatalogPage, CatalogType, Offer, PageLocalization } from '../../api';
import {
    bindCatalogQueryClient,
    buildPurchasableOffer,
    catalogIndexKey,
    catalogPageKey,
    cloneCachedCatalogPages,
    dropCatalogCache,
    invalidateCatalogIndex,
    invalidateCatalogPage,
    isOfferAllowedInCatalogType,
    readCatalogIndex,
    selectCatalogIndex,
    selectCatalogPage
} from './useCatalogQueries';

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

const parserOffer = (offerId: number, products = [parserProduct()], overrides: Partial<Record<string, unknown>> = {}) => ({
    offerId,
    localizationId: `offer_${offerId}`,
    rent: false,
    priceCredits: 3,
    priceActivityPoints: 0,
    priceActivityPointsType: 0,
    giftable: true,
    clubLevel: 0,
    products,
    bundlePurchaseAllowed: false,
    itemIds: '',
    haveOffer: false,
    ...overrides
});

const parserNode = (pageId: number, children: any[] = [], offerIds: number[] = []) => ({
    visible: true,
    icon: 0,
    pageId,
    parentId: -1,
    pageName: `page_${pageId}`,
    localization: `Page ${pageId}`,
    children,
    offerIds
});

describe('catalog query keys', () => {
    it('scope the index and the pages under the same root', () => {
        expect(catalogIndexKey(CatalogType.NORMAL)).toEqual(['octane', 'catalog', 'index', 'NORMAL']);
        expect(catalogPageKey(CatalogType.BUILDER, 7)).toEqual(['octane', 'catalog', 'page', CatalogType.BUILDER, 7]);
    });
});

describe('buildPurchasableOffer', () => {
    it('builds an Offer with one Product per parser product', () => {
        const offer = buildPurchasableOffer(parserOffer(5, [parserProduct(), parserProduct({ furniClassId: 11 })]), lookups);

        expect(offer).toBeInstanceOf(Offer);
        expect(offer.offerId).toBe(5);
        expect(offer.products).toHaveLength(2);
        expect(offer.product.furnitureData).toBe(furnitureData);
    });

    it('returns null when the parser offer carries no products', () => {
        expect(buildPurchasableOffer(parserOffer(5, []), lookups)).toBeNull();
    });
});

describe('isOfferAllowedInCatalogType', () => {
    it('keeps every offer in the normal catalog and drops bundles in the builder catalog', () => {
        const bundle = buildPurchasableOffer(parserOffer(1, [parserProduct(), parserProduct({ furniClassId: 11 })]), lookups);
        const single = buildPurchasableOffer(parserOffer(2), lookups);

        expect(isOfferAllowedInCatalogType(bundle, CatalogType.NORMAL)).toBe(true);
        expect(isOfferAllowedInCatalogType(bundle, CatalogType.BUILDER)).toBe(false);
        expect(isOfferAllowedInCatalogType(single, CatalogType.BUILDER)).toBe(true);
    });
});

describe('selectCatalogIndex', () => {
    it('returns the built tree and the offer index', () => {
        const root = parserNode(-1, [parserNode(1, [], [100, 101]), parserNode(2, [], [101])]);
        const index = selectCatalogIndex({ root } as any);

        expect(index.rootNode.children).toHaveLength(2);
        expect(index.offersToNodes.get(101)).toHaveLength(2);
    });
});

describe('selectCatalogPage', () => {
    const parserPage = (overrides: Partial<Record<string, unknown>> = {}) => ({
        pageId: 3,
        catalogType: CatalogType.NORMAL,
        layoutCode: 'default_3x3',
        localization: { images: ['a.png'], texts: ['Hello'] },
        offers: [parserOffer(1), parserOffer(2, [])],
        offerId: 2,
        acceptSeasonCurrencyAsCredits: true,
        frontPageItems: [],
        ...overrides
    });

    it('builds the page, skipping parser offers without products', () => {
        const data = selectCatalogPage(parserPage() as any, CatalogType.NORMAL, lookups);

        expect(data.page).toBeInstanceOf(CatalogPage);
        expect(data.page.pageId).toBe(3);
        expect(data.page.layoutCode).toBe('default_3x3');
        expect(data.page.offers.map((offer) => offer.offerId)).toEqual([1]);
        expect(data.page.acceptSeasonCurrencyAsCredits).toBe(true);
        expect(data.page.localization.getText(0)).toBe('Hello');
        expect(data.offerId).toBe(2);
    });

    it('applies the builder pricing-model filter', () => {
        const bundle = parserOffer(9, [parserProduct(), parserProduct({ furniClassId: 11 })]);
        const data = selectCatalogPage(parserPage({ offers: [bundle, parserOffer(1)] }) as any, CatalogType.BUILDER, lookups);

        expect(data.page.offers.map((offer) => offer.offerId)).toEqual([1]);
    });

    it('passes the front page items through', () => {
        const items = [{ type: 1 }] as any;
        const data = selectCatalogPage(parserPage({ frontPageItems: items }) as any, CatalogType.NORMAL, lookups);

        expect(data.frontPageItems).toBe(items);
    });
});

describe('cache helpers', () => {
    it('read, invalidate and drop through the bound client', () => {
        const client = new QueryClient();
        bindCatalogQueryClient(client);

        const index = { rootNode: {} as any, offersToNodes: new Map() };
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), index);
        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 3), { page: null, frontPageItems: [], offerId: -1 });

        expect(readCatalogIndex(CatalogType.NORMAL)).toBe(index);

        invalidateCatalogIndex(CatalogType.NORMAL);
        expect(client.getQueryState(catalogIndexKey(CatalogType.NORMAL)).isInvalidated).toBe(true);

        invalidateCatalogPage(CatalogType.NORMAL, 3);
        expect(client.getQueryState(catalogPageKey(CatalogType.NORMAL, 3)).isInvalidated).toBe(true);

        dropCatalogCache();
        expect(readCatalogIndex(CatalogType.NORMAL)).toBeUndefined();
        expect(client.getQueryData(catalogPageKey(CatalogType.NORMAL, 3))).toBeUndefined();

        bindCatalogQueryClient(null);
    });

    it('cloneCachedCatalogPages rebuilds every cached page with cloned offers', () => {
        const client = new QueryClient();
        bindCatalogQueryClient(client);

        const offer = buildPurchasableOffer(parserOffer(1), lookups);
        const page = new CatalogPage(3, 'default_3x3', new PageLocalization([], []), [offer], false);
        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 3), { page, frontPageItems: [], offerId: -1 });

        cloneCachedCatalogPages();

        const after = client.getQueryData<{ page: CatalogPage }>(catalogPageKey(CatalogType.NORMAL, 3));
        expect(after.page).not.toBe(page);
        expect(after.page.offers[0]).not.toBe(offer);
        expect(after.page.offers[0].offerId).toBe(1);

        bindCatalogQueryClient(null);
    });

    it('helpers are no-ops when no client is bound', () => {
        bindCatalogQueryClient(null);
        expect(() => invalidateCatalogIndex(CatalogType.NORMAL)).not.toThrow();
        expect(readCatalogIndex(CatalogType.NORMAL)).toBeUndefined();
    });
});
