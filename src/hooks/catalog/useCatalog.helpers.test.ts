import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuilderFurniPlaceableStatus } from '../../api/catalog/BuilderFurniPlaceableStatus';
import { CatalogType } from '../../api/catalog/CatalogType';
import * as catalogHelpers from './useCatalog.helpers';
import {
    buildCatalogNodeTree,
    createCatalogPageRequestCorrelation,
    findNodeById,
    findNodeByName,
    getNodesByOfferIdFromMap,
    getOfferProductKeys,
    isCurrentCatalogPageResponse,
    normalizeCatalogType,
    resolveBuilderFurniPlaceableStatus
} from './useCatalog.helpers';

describe('catalog index request coordinator', () => {
    it('sends the first request and suppresses a duplicate while it is in flight', () => {
        const sentTypes: string[] = [];
        const coordinator = (catalogHelpers.createCatalogIndexRequestCoordinator as any)((type: string) => sentTypes.push(type), 10_000, () => 1_000);

        expect(coordinator).toBeDefined();
        if (!coordinator) return;

        expect(coordinator.request(CatalogType.NORMAL)).toBe(true);
        expect(coordinator.request(CatalogType.NORMAL)).toBe(false);
        expect(sentTypes).toEqual([CatalogType.NORMAL]);
    });

    it('allows another request after the matching response completes', () => {
        const sentTypes: string[] = [];
        const coordinator = (catalogHelpers.createCatalogIndexRequestCoordinator as any)((type: string) => sentTypes.push(type), 10_000, () => 1_000);

        expect(coordinator).toBeDefined();
        if (!coordinator) return;

        coordinator.request(CatalogType.NORMAL);
        coordinator.complete(CatalogType.NORMAL);

        expect(coordinator.request(CatalogType.NORMAL)).toBe(true);
        expect(sentTypes).toEqual([CatalogType.NORMAL, CatalogType.NORMAL]);
    });

    it('retries an index request after the in-flight timeout', () => {
        let now = 1_000;
        const sentTypes: string[] = [];
        const coordinator = (catalogHelpers.createCatalogIndexRequestCoordinator as any)((type: string) => sentTypes.push(type), 10_000, () => now);

        expect(coordinator).toBeDefined();
        if (!coordinator) return;

        coordinator.request(CatalogType.NORMAL);
        now = 11_000;

        expect(coordinator.request(CatalogType.NORMAL)).toBe(true);
        expect(sentTypes).toEqual([CatalogType.NORMAL, CatalogType.NORMAL]);
    });
});

describe('catalog index prewarm controller', () => {
    // The login prewarm is deferred to an idle slot so it cannot land in the
    // middle of authentication and room entry; run those callbacks on demand.
    let idleCallbacks: Array<() => void> = [];

    beforeEach(() => {
        idleCallbacks = [];
        (globalThis as any).requestIdleCallback = (cb: () => void) => {
            idleCallbacks.push(cb);

            return idleCallbacks.length;
        };
    });

    afterEach(() => {
        delete (globalThis as any).requestIdleCallback;
    });

    const runIdle = () => {
        const pending = idleCallbacks;

        idleCallbacks = [];
        pending.forEach(cb => cb());
    };

    it('prewarms the current catalog once the thread is idle after authenticating', () => {
        const requestedTypes: string[] = [];
        const controller = (catalogHelpers as any).createCatalogIndexPrewarmController((type: string) => requestedTypes.push(type));

        expect(controller).toBeDefined();
        if (!controller) return;

        controller.update({ authenticated: false, visible: false, hasIndex: false, catalogType: CatalogType.NORMAL });
        controller.update({ authenticated: true, visible: false, hasIndex: false, catalogType: CatalogType.NORMAL });
        controller.update({ authenticated: true, visible: false, hasIndex: true, catalogType: CatalogType.NORMAL });

        // nothing on the critical path: authentication and room entry come first
        expect(requestedTypes).toEqual([]);

        runIdle();

        expect(requestedTypes).toEqual([CatalogType.NORMAL]);
    });

    it('refreshes once on each opening even when the prewarmed index is available', () => {
        const requestedTypes: string[] = [];
        const controller = (catalogHelpers as any).createCatalogIndexPrewarmController((type: string) => requestedTypes.push(type));

        expect(controller).toBeDefined();
        if (!controller) return;

        controller.update({ authenticated: true, visible: false, hasIndex: false, catalogType: CatalogType.NORMAL });
        runIdle();
        requestedTypes.length = 0;
        // opening is a request the user is waiting on, so it stays synchronous
        controller.update({ authenticated: true, visible: true, hasIndex: true, catalogType: CatalogType.NORMAL });
        controller.update({ authenticated: true, visible: true, hasIndex: true, catalogType: CatalogType.NORMAL });
        controller.update({ authenticated: true, visible: false, hasIndex: true, catalogType: CatalogType.NORMAL });
        controller.update({ authenticated: true, visible: true, hasIndex: true, catalogType: CatalogType.NORMAL });

        expect(requestedTypes).toEqual([CatalogType.NORMAL, CatalogType.NORMAL]);
    });

    it('prewarms again after reconnecting', () => {
        const requestedTypes: string[] = [];
        const controller = (catalogHelpers as any).createCatalogIndexPrewarmController((type: string) => requestedTypes.push(type));

        expect(controller).toBeDefined();
        if (!controller) return;

        controller.update({ authenticated: true, visible: false, hasIndex: false, catalogType: CatalogType.NORMAL });
        controller.update({ authenticated: false, visible: false, hasIndex: false, catalogType: CatalogType.NORMAL });
        controller.update({ authenticated: true, visible: false, hasIndex: false, catalogType: CatalogType.NORMAL });

        runIdle();

        expect(requestedTypes).toEqual([CatalogType.NORMAL, CatalogType.NORMAL]);
    });
});

describe('restoreCatalogActivePath', () => {
    it('rebinds the active path to nodes from a refreshed catalog tree', () => {
        const restore = (catalogHelpers as any).restoreCatalogActivePath;
        expect(restore).toBeTypeOf('function');
        if (!restore) return;

        const root: any = { pageId: -1, pageName: 'root', children: [] };
        const parent: any = { pageId: 10, pageName: 'parent', parent: root, children: [], activate: vi.fn(), open: vi.fn() };
        const child: any = { pageId: 11, pageName: 'child', parent, children: [], activate: vi.fn(), open: vi.fn() };
        root.children = [parent];
        parent.children = [child];

        const restored = restore(root, 11);

        expect(restored).toEqual([parent, child]);
        expect(parent.activate).toHaveBeenCalledOnce();
        expect(child.activate).toHaveBeenCalledOnce();
        expect(parent.open).toHaveBeenCalledOnce();
    });
});

describe('catalog page request correlation', () => {
    afterEach(() => vi.useRealTimers());

    it('accepts only the response for the page that is still requested', () => {
        expect(isCurrentCatalogPageResponse(12, 12)).toBe(true);
        expect(isCurrentCatalogPageResponse(12, 9)).toBe(false);
    });

    it('matches an immediate response before React can render the requested page id', () => {
        const correlation = createCatalogPageRequestCorrelation();

        correlation.request(12);

        expect(correlation.matches(12)).toBe(true);
        expect(correlation.matches(9)).toBe(false);
    });

    it('reports the timeout but still accepts a late response for the same page', () => {
        vi.useFakeTimers();
        const correlation = createCatalogPageRequestCorrelation();
        let timedOutPageId = -1;

        correlation.request(
            12,
            (pageId) => {
                timedOutPageId = pageId;
            },
            5000
        );
        vi.advanceTimersByTime(5000);

        expect(timedOutPageId).toBe(12);
        expect(correlation.matches(12)).toBe(true);
        expect(correlation.matches(9)).toBe(false);
        expect(correlation.complete(12)).toBe(true);
        expect(correlation.complete(12)).toBe(false);
    });

    it('completes only the current request and cancels its timeout', () => {
        vi.useFakeTimers();
        const correlation = createCatalogPageRequestCorrelation();
        let timeoutCount = 0;

        correlation.request(12, () => timeoutCount++, 5000);

        expect(correlation.complete(9)).toBe(false);
        expect(correlation.complete(12)).toBe(true);
        vi.advanceTimersByTime(5000);
        expect(timeoutCount).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// normalizeCatalogType
// ---------------------------------------------------------------------------

describe('normalizeCatalogType', () => {
    it('returns BUILDER when explicitly asked for BUILDER', () => {
        expect(normalizeCatalogType(CatalogType.BUILDER)).toBe(CatalogType.BUILDER);
    });

    it('returns NORMAL for the explicit NORMAL value', () => {
        expect(normalizeCatalogType(CatalogType.NORMAL)).toBe(CatalogType.NORMAL);
    });

    it('returns NORMAL when type is omitted', () => {
        expect(normalizeCatalogType()).toBe(CatalogType.NORMAL);
    });

    it('returns NORMAL for any unknown string', () => {
        expect(normalizeCatalogType('something_else')).toBe(CatalogType.NORMAL);
        expect(normalizeCatalogType('')).toBe(CatalogType.NORMAL);
    });
});

// ---------------------------------------------------------------------------
// getOfferProductKeys
// ---------------------------------------------------------------------------

describe('getOfferProductKeys', () => {
    const makeOffer = (overrides: any = {}) =>
        ({
            product: {
                productType: 'floor',
                productClassId: 42,
                furnitureData: { className: 'chair_basic' },
                ...overrides
            }
        }) as any;

    it('returns both id and className keys when the product has both', () => {
        expect(getOfferProductKeys(makeOffer())).toEqual(['floor:id:42', 'floor:class:chair_basic']);
    });

    it('omits the id key when productClassId is negative', () => {
        const offer = makeOffer({ productClassId: -1 });

        expect(getOfferProductKeys(offer)).toEqual(['floor:class:chair_basic']);
    });

    it('omits the className key when furnitureData has no className', () => {
        const offer = makeOffer({ furnitureData: { className: '' } });

        expect(getOfferProductKeys(offer)).toEqual(['floor:id:42']);
    });

    it('returns an empty array when the offer has no product', () => {
        expect(getOfferProductKeys(null)).toEqual([]);
        expect(getOfferProductKeys(undefined)).toEqual([]);
        expect(getOfferProductKeys({} as any)).toEqual([]);
    });

    it('returns an empty array when productType is missing', () => {
        const offer = makeOffer({ productType: '' });

        expect(getOfferProductKeys(offer)).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// findNodeById / findNodeByName
// ---------------------------------------------------------------------------

const makeNode = (overrides: { pageId?: number; pageName?: string; children?: any[] } = {}) => ({
    pageId: overrides.pageId ?? -1,
    pageName: overrides.pageName ?? 'unnamed',
    isVisible: true,
    children: overrides.children ?? []
});

describe('findNodeById', () => {
    it('returns null when the input node is null', () => {
        expect(findNodeById(7, null, null)).toBeNull();
    });

    it('skips the root node even when its pageId matches', () => {
        const root = makeNode({ pageId: 7, pageName: 'root' }) as any;

        expect(findNodeById(7, root, root)).toBeNull();
    });

    it('finds an immediate child by pageId', () => {
        const child = makeNode({ pageId: 7, pageName: 'shop' }) as any;
        const root = makeNode({ pageId: 0, pageName: 'root', children: [child] }) as any;

        expect(findNodeById(7, root, root)).toBe(child);
    });

    it('descends into grandchildren', () => {
        const grandchild = makeNode({ pageId: 42, pageName: 'sale' }) as any;
        const child = makeNode({ pageId: 7, pageName: 'shop', children: [grandchild] }) as any;
        const root = makeNode({ pageId: 0, pageName: 'root', children: [child] }) as any;

        expect(findNodeById(42, root, root)).toBe(grandchild);
    });

    it('returns null when no node has that pageId', () => {
        const child = makeNode({ pageId: 7, pageName: 'shop' }) as any;
        const root = makeNode({ pageId: 0, pageName: 'root', children: [child] }) as any;

        expect(findNodeById(99, root, root)).toBeNull();
    });
});

describe('findNodeByName', () => {
    it('finds a node by pageName ignoring the root', () => {
        const child = makeNode({ pageName: 'frontpage' }) as any;
        const root = makeNode({ pageName: 'root', children: [child] }) as any;

        expect(findNodeByName('frontpage', root, root)).toBe(child);
        expect(findNodeByName('root', root, root)).toBeNull();
    });

    it('returns null when nothing matches', () => {
        const root = makeNode({ pageName: 'root', children: [makeNode({ pageName: 'a' }) as any] }) as any;

        expect(findNodeByName('b', root, root)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// getNodesByOfferIdFromMap
// ---------------------------------------------------------------------------

describe('getNodesByOfferIdFromMap', () => {
    const visibleNode = (id: number) => ({ pageId: id, isVisible: true }) as any;
    const hiddenNode = (id: number) => ({ pageId: id, isVisible: false }) as any;

    it('returns null when the map is missing or empty', () => {
        expect(getNodesByOfferIdFromMap(1, null)).toBeNull();
        expect(getNodesByOfferIdFromMap(1, undefined)).toBeNull();
        expect(getNodesByOfferIdFromMap(1, new Map())).toBeNull();
    });

    it('returns the raw bucket when onlyVisible is false', () => {
        const bucket = [visibleNode(1), hiddenNode(2)];
        const map = new Map([[9, bucket]]);

        expect(getNodesByOfferIdFromMap(9, map)).toBe(bucket);
    });

    it('filters out hidden nodes when onlyVisible is true', () => {
        const visible = visibleNode(1);
        const map = new Map([[9, [visible, hiddenNode(2)]]]);

        expect(getNodesByOfferIdFromMap(9, map, true)).toEqual([visible]);
    });

    it('falls back to the raw bucket when no visible nodes remain', () => {
        const bucket = [hiddenNode(1), hiddenNode(2)];
        const map = new Map([[9, bucket]]);

        expect(getNodesByOfferIdFromMap(9, map, true)).toBe(bucket);
    });

    it('returns null for an offerId not in the map', () => {
        const map = new Map([[1, [visibleNode(1)]]]);

        expect(getNodesByOfferIdFromMap(99, map)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// buildCatalogNodeTree
// ---------------------------------------------------------------------------

describe('buildCatalogNodeTree', () => {
    // CatalogNode in the real codebase reads `node.pageId`, `node.pageName`,
    // `node.offerIds`, `node.children`. Anything else is irrelevant to the
    // build step.
    const makeNodeData = (overrides: any = {}) => ({
        pageId: -1,
        pageName: 'unnamed',
        localization: '',
        iconId: -1,
        offerIds: [] as number[],
        children: [] as any[],
        visible: true,
        ...overrides
    });

    it('returns a CatalogNode root with the depth=0', () => {
        const rootData = makeNodeData({ pageId: 0, pageName: 'root' });
        const { rootNode, offersToNodes } = buildCatalogNodeTree(rootData as any);

        expect(rootNode.pageId).toBe(0);
        expect(rootNode.depth).toBe(0);
        expect(offersToNodes.size).toBe(0);
    });

    it('walks children depth-first and tracks offerId mappings', () => {
        const leaf = makeNodeData({ pageId: 5, pageName: 'sale', offerIds: [100, 200] });
        const branch = makeNodeData({ pageId: 3, pageName: 'shop', offerIds: [100], children: [leaf] });
        const rootData = makeNodeData({ pageId: 0, pageName: 'root', children: [branch] });

        const { rootNode, offersToNodes } = buildCatalogNodeTree(rootData as any);

        // tree shape
        expect(rootNode.children).toHaveLength(1);
        expect(rootNode.children[0].pageId).toBe(3);
        expect(rootNode.children[0].children[0].pageId).toBe(5);

        // depth incremented
        expect(rootNode.depth).toBe(0);
        expect(rootNode.children[0].depth).toBe(1);
        expect(rootNode.children[0].children[0].depth).toBe(2);

        // offerId index records both nodes for offer 100, only the leaf for 200
        expect(offersToNodes.get(100)).toHaveLength(2);
        expect(offersToNodes.get(100)?.map((n) => n.pageId)).toEqual([3, 5]);
        expect(offersToNodes.get(200)?.map((n) => n.pageId)).toEqual([5]);
    });

    it('preserves child-parent relationships', () => {
        const leaf = makeNodeData({ pageId: 5, pageName: 'sale' });
        const rootData = makeNodeData({ pageId: 0, pageName: 'root', children: [leaf] });

        const { rootNode } = buildCatalogNodeTree(rootData as any);

        expect(rootNode.children[0].parent).toBe(rootNode);
    });
});

// ---------------------------------------------------------------------------
// resolveBuilderFurniPlaceableStatus
// ---------------------------------------------------------------------------

describe('resolveBuilderFurniPlaceableStatus', () => {
    const offer = { offerId: 1 } as any;

    const baseInput = {
        offer,
        roomSession: { isGuildRoom: false, isRoomOwner: true, controllerLevel: 0 },
        secondsLeft: 60,
        furniCount: 0,
        furniLimit: 10,
        builderPlacementAllowedInCurrentRoom: false,
        builderPlacementBlockedByVisitors: false,
        visitorCount: 0
    };

    it('returns MISSING_OFFER when offer is null', () => {
        expect(resolveBuilderFurniPlaceableStatus({ ...baseInput, offer: null })).toBe(BuilderFurniPlaceableStatus.MISSING_OFFER);
    });

    it('returns NOT_IN_ROOM when roomSession is null', () => {
        expect(resolveBuilderFurniPlaceableStatus({ ...baseInput, roomSession: null })).toBe(BuilderFurniPlaceableStatus.NOT_IN_ROOM);
    });

    it('returns OKAY for the room owner with time on the clock', () => {
        expect(resolveBuilderFurniPlaceableStatus(baseInput)).toBe(BuilderFurniPlaceableStatus.OKAY);
    });

    it('returns NOT_GROUP_ADMIN for a non-owner without group fallback or shared pool', () => {
        const input = {
            ...baseInput,
            roomSession: { isGuildRoom: false, isRoomOwner: false, controllerLevel: 0 }
        };

        expect(resolveBuilderFurniPlaceableStatus(input)).toBe(BuilderFurniPlaceableStatus.NOT_GROUP_ADMIN);
    });

    it('returns OKAY for guild admin with subscription time remaining', () => {
        const input = {
            ...baseInput,
            roomSession: { isGuildRoom: true, isRoomOwner: false, controllerLevel: 4 /* GUILD_ADMIN */ },
            secondsLeft: 60
        };

        expect(resolveBuilderFurniPlaceableStatus(input)).toBe(BuilderFurniPlaceableStatus.OKAY);
    });

    it('returns FURNI_LIMIT_REACHED when count meets the limit and no shared pool applies', () => {
        const input = { ...baseInput, furniCount: 10, furniLimit: 10 };

        expect(resolveBuilderFurniPlaceableStatus(input)).toBe(BuilderFurniPlaceableStatus.FURNI_LIMIT_REACHED);
    });

    it('skips the furni limit when builderPlacementAllowedInCurrentRoom for a non-owner', () => {
        const input = {
            ...baseInput,
            roomSession: { isGuildRoom: false, isRoomOwner: false, controllerLevel: 0 },
            furniCount: 99,
            furniLimit: 10,
            builderPlacementAllowedInCurrentRoom: true
        };

        expect(resolveBuilderFurniPlaceableStatus(input)).toBe(BuilderFurniPlaceableStatus.OKAY);
    });

    it('returns VISITORS_IN_ROOM when the subscription has expired and the flag is set', () => {
        const input = {
            ...baseInput,
            secondsLeft: 0,
            builderPlacementBlockedByVisitors: true
        };

        expect(resolveBuilderFurniPlaceableStatus(input)).toBe(BuilderFurniPlaceableStatus.VISITORS_IN_ROOM);
    });

    it('returns VISITORS_IN_ROOM when the subscription has expired and there are visitors counted', () => {
        const input = { ...baseInput, secondsLeft: 0, visitorCount: 3 };

        expect(resolveBuilderFurniPlaceableStatus(input)).toBe(BuilderFurniPlaceableStatus.VISITORS_IN_ROOM);
    });

    it('returns OKAY when the subscription has expired but the room is empty', () => {
        const input = { ...baseInput, secondsLeft: 0, visitorCount: 0 };

        expect(resolveBuilderFurniPlaceableStatus(input)).toBe(BuilderFurniPlaceableStatus.OKAY);
    });
});
