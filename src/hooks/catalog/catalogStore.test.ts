import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogNode, CatalogPage, CatalogType, PageLocalization, ProductTypeEnum, SearchResult } from '../../api';
import { INITIAL_CATALOG_UI_STATE, useCatalogStore } from './catalogStore';
import { bindCatalogQueryClient, catalogIndexKey, catalogPageKey } from './useCatalogQueries';

const node = (pageId: number, pageName: string, parent: any, offerIds: number[] = [], visible = true) => {
    const created = new CatalogNode(
        { visible, icon: 0, pageId, parentId: parent?.pageId ?? -1, pageName, localization: pageName, children: [], offerIds } as any,
        parent ? parent.depth + 1 : 0,
        parent
    );

    if (parent) parent.addChild(created);

    return created;
};

const buildIndex = () => {
    const root = node(-1, 'root', null);
    const furni = node(1, 'furni', root);
    const chairs = node(2, 'chairs', furni, [100, 101]);
    const tables = node(3, 'tables', furni, [102]);
    const hidden = node(4, 'hidden', root, [], false);
    const offersToNodes = new Map<number, any[]>([
        [100, [chairs]],
        [101, [chairs]],
        [102, [tables]]
    ]);

    return { root, furni, chairs, tables, hidden, offersToNodes };
};

let client: QueryClient;

beforeEach(() => {
    client = new QueryClient();
    bindCatalogQueryClient(client);
    useCatalogStore.setState({ ...INITIAL_CATALOG_UI_STATE });
});

afterEach(() => {
    bindCatalogQueryClient(null);
    vi.restoreAllMocks();
});

describe('catalogStore navigation', () => {
    it('activateNode sets the active path, opens the ancestors and sets the page id', () => {
        const { root, furni, chairs } = buildIndex();
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map() });

        useCatalogStore.getState().activateNode(chairs, 101);

        const state = useCatalogStore.getState();
        expect(state.activeNodes).toEqual([furni, chairs]);
        expect(state.pageId).toBe(2);
        expect(state.pendingOfferId).toBe(101);
        expect(furni.isOpen).toBe(true);
        expect(chairs.isActive).toBe(true);
        expect(state.pageOverride).toBeNull();
        expect(state.currentOffer).toBeNull();
    });

    it('activateNode on a root child descends to its first visible child', () => {
        const { root, furni, chairs } = buildIndex();
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map() });

        useCatalogStore.getState().activateNode(furni);

        expect(useCatalogStore.getState().activeNodes).toEqual([furni, chairs]);
        expect(useCatalogStore.getState().pageId).toBe(2);
    });

    it('activating the active open node closes it', () => {
        const { root, furni, chairs } = buildIndex();
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map() });

        useCatalogStore.getState().activateNode(chairs);
        expect(chairs.isOpen).toBe(true);
        useCatalogStore.getState().activateNode(chairs);
        expect(chairs.isOpen).toBe(false);
    });

    it('openPageById with the index in cache activates the node', () => {
        const { root, tables } = buildIndex();
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map() });
        useCatalogStore.setState({ isVisible: true });

        useCatalogStore.getState().openPageById(3);

        expect(useCatalogStore.getState().activeNodes.at(-1)).toBe(tables);
        expect(useCatalogStore.getState().pageId).toBe(3);
    });

    it('openPageById while hidden stores a pending request and shows the catalog', () => {
        useCatalogStore.getState().openPageById(3);

        const state = useCatalogStore.getState();
        expect(state.isVisible).toBe(true);
        expect(state.pendingRequest).toEqual({ kind: 'id', id: 3 });
        expect(state.pageId).toBe(-1);
    });

    it('openPageByName and openPageByOfferId resolve through the index', () => {
        const { root, chairs, tables, offersToNodes } = buildIndex();
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes });
        useCatalogStore.setState({ isVisible: true });

        useCatalogStore.getState().openPageByName('tables');
        expect(useCatalogStore.getState().activeNodes.at(-1)).toBe(tables);

        useCatalogStore.getState().openPageByOfferId(100);
        expect(useCatalogStore.getState().activeNodes.at(-1)).toBe(chairs);
        expect(useCatalogStore.getState().pendingOfferId).toBe(100);
    });

    it('resolvePendingRequest applies the stored request once the index exists', () => {
        const { root, tables } = buildIndex();
        useCatalogStore.getState().openPageById(3);
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map() });

        useCatalogStore.getState().resolvePendingRequest();

        expect(useCatalogStore.getState().pendingRequest).toBeNull();
        expect(useCatalogStore.getState().activeNodes.at(-1)).toBe(tables);
    });

    it('resolvePendingRequest with no request and no page opens the first visible root child', () => {
        const { root, chairs } = buildIndex();
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map() });
        useCatalogStore.setState({ isVisible: true });

        useCatalogStore.getState().resolvePendingRequest();

        expect(useCatalogStore.getState().pageId).toBe(chairs.pageId);
    });
});

describe('catalogStore visibility and type', () => {
    it('toggleCatalogByType hides an open catalog of the same type', () => {
        useCatalogStore.setState({ isVisible: true, currentType: CatalogType.NORMAL });
        useCatalogStore.getState().toggleCatalogByType(CatalogType.NORMAL);
        expect(useCatalogStore.getState().isVisible).toBe(false);
    });

    it('switching type resets the visible state', () => {
        useCatalogStore.setState({ isVisible: true, currentType: CatalogType.NORMAL, pageId: 2, activeNodes: [{} as any] });
        useCatalogStore.getState().openCatalogByType(CatalogType.BUILDER);

        const state = useCatalogStore.getState();
        expect(state.currentType).toBe(CatalogType.BUILDER);
        expect(state.pageId).toBe(-1);
        expect(state.activeNodes).toEqual([]);
        expect(state.isVisible).toBe(true);
    });

    it('an unknown type normalises to NORMAL', () => {
        useCatalogStore.getState().openCatalogByType('nonsense');
        expect(useCatalogStore.getState().currentType).toBe(CatalogType.NORMAL);
    });

    it('setIsVisible accepts an updater function', () => {
        useCatalogStore.setState({ isVisible: false });
        useCatalogStore.getState().setIsVisible((prev) => !prev);
        expect(useCatalogStore.getState().isVisible).toBe(true);
        useCatalogStore.getState().setIsVisible((prev) => !prev);
        expect(useCatalogStore.getState().isVisible).toBe(false);
    });
});

describe('catalogStore page override and search', () => {
    const syntheticPage = () => new CatalogPage(-1, 'default_3x3', new PageLocalization([], []), [], false, 1);

    it('setCurrentPage stores an override and activateNode clears it', () => {
        const { root, chairs } = buildIndex();
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map() });
        const page = syntheticPage();

        useCatalogStore.getState().setCurrentPage(page);
        expect(useCatalogStore.getState().pageOverride).toBe(page);

        useCatalogStore.getState().activateNode(chairs);
        expect(useCatalogStore.getState().pageOverride).toBeNull();
    });

    it('clearing the search result while a search page is shown reopens the previous page', () => {
        const { root, tables } = buildIndex();
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: root, offersToNodes: new Map() });
        useCatalogStore.setState({ isVisible: true, previousPageId: 3, pageOverride: syntheticPage(), searchResult: new SearchResult('x', [], []) });

        useCatalogStore.getState().setSearchResult(null);

        expect(useCatalogStore.getState().pageOverride).toBeNull();
        expect(useCatalogStore.getState().activeNodes.at(-1)).toBe(tables);
    });

    it('setCurrentOffer resets the purchase options', () => {
        useCatalogStore.setState({ purchaseOptions: { quantity: 4, extraData: 'x', extraParamRequired: true, previewStuffData: null } });
        useCatalogStore.getState().setCurrentOffer({ offerId: 1, product: null } as any);
        expect(useCatalogStore.getState().purchaseOptions).toEqual({ quantity: 1, extraData: null, extraParamRequired: false, previewStuffData: null });
    });

    it('selectCatalogOffer resets purchaseOptions.extraData to null for a WALL offer, matching the old reset-effect outcome', () => {
        useCatalogStore.setState({ purchaseOptions: { quantity: 4, extraData: 'stale', extraParamRequired: true, previewStuffData: null } });

        const wallOffer = { offerId: 5, isLazy: false, product: { productType: ProductTypeEnum.WALL, extraParam: 'some_param' } } as any;

        useCatalogStore.getState().selectCatalogOffer(wallOffer);

        expect(useCatalogStore.getState().purchaseOptions).toEqual({ quantity: 1, extraData: null, extraParamRequired: false, previewStuffData: null });
        expect(useCatalogStore.getState().currentOffer).toBe(wallOffer);
    });
});

describe('catalogStore localization refresh', () => {
    it('bumpLocalizationVersion clones the offers on a pageOverride, not just currentOffer', () => {
        const clonedOffer = { offerId: 1 };
        const clone = vi.fn(() => clonedOffer);
        const offer = { offerId: 1, clone };
        const page = new CatalogPage(-1, 'default_3x3', new PageLocalization([], []), [offer as any], false, 1);

        useCatalogStore.setState({ pageOverride: page as any });
        useCatalogStore.getState().bumpLocalizationVersion();

        expect(clone).toHaveBeenCalledOnce();
        expect(useCatalogStore.getState().pageOverride).not.toBe(page);
        expect(useCatalogStore.getState().catalogLocalizationVersion).toBe(1);
    });

    it('bumpLocalizationVersion leaves a null pageOverride untouched', () => {
        useCatalogStore.setState({ pageOverride: null });
        useCatalogStore.getState().bumpLocalizationVersion();

        expect(useCatalogStore.getState().pageOverride).toBeNull();
    });
});

describe('catalogStore refresh actions', () => {
    it('refreshIndex and refreshCurrentPage invalidate the matching queries', () => {
        client.setQueryData(catalogIndexKey(CatalogType.NORMAL), { rootNode: {} as any, offersToNodes: new Map() });
        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 2), { page: null, frontPageItems: [], offerId: -1 });
        useCatalogStore.setState({ pageId: 2 });

        useCatalogStore.getState().refreshIndex();
        useCatalogStore.getState().refreshCurrentPage();

        expect(client.getQueryState(catalogIndexKey(CatalogType.NORMAL)).isInvalidated).toBe(true);
        expect(client.getQueryState(catalogPageKey(CatalogType.NORMAL, 2)).isInvalidated).toBe(true);
    });

    it('refreshCurrentPage clears an override for the current page and keeps the search override', () => {
        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 2), { page: null, frontPageItems: [], offerId: -1 });
        const samePage = new CatalogPage(2, 'default_3x3', new PageLocalization([], []), [], false);
        useCatalogStore.setState({ pageId: 2, pageOverride: samePage });

        useCatalogStore.getState().refreshCurrentPage();

        expect(useCatalogStore.getState().pageOverride).toBeNull();
        expect(client.getQueryState(catalogPageKey(CatalogType.NORMAL, 2)).isInvalidated).toBe(true);

        const searchPage = new CatalogPage(-1, 'default_3x3', new PageLocalization([], []), [], false, 1);
        useCatalogStore.setState({ pageId: 2, pageOverride: searchPage });

        useCatalogStore.getState().refreshCurrentPage();

        expect(useCatalogStore.getState().pageOverride).toBe(searchPage);
    });
});
