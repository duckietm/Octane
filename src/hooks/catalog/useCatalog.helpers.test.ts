import { describe, expect, it, vi } from 'vitest';
import { BuilderFurniPlaceableStatus } from '../../api/catalog/BuilderFurniPlaceableStatus';
import { CatalogType } from '../../api/catalog/CatalogType';
import {
    buildCatalogNodeTree,
    findNodeById,
    findNodeByName,
    getNodesByOfferIdFromMap,
    normalizeCatalogType,
    resolveBuilderFurniPlaceableStatus,
    restoreCatalogActivePath
} from './useCatalog.helpers';

describe('restoreCatalogActivePath', () => {
    it('rebinds the active path to nodes from a refreshed catalog tree', () => {
        const root: any = { pageId: -1, pageName: 'root', children: [] };
        const parent: any = { pageId: 10, pageName: 'parent', parent: root, children: [], activate: vi.fn(), open: vi.fn() };
        const child: any = { pageId: 11, pageName: 'child', parent, children: [], activate: vi.fn(), open: vi.fn() };
        root.children = [parent];
        parent.children = [child];

        const restored = restoreCatalogActivePath(root, 11);

        expect(restored).toEqual([parent, child]);
        expect(parent.activate).toHaveBeenCalledOnce();
        expect(child.activate).toHaveBeenCalledOnce();
        expect(parent.open).toHaveBeenCalledOnce();
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
