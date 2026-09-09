import { NodeData, RoomControllerLevel, RoomObjectCategory, RoomObjectType } from '@octane/renderer';
import { BuilderFurniPlaceableStatus, CatalogNode, CatalogPage, CatalogType, ICatalogNode, ICatalogPage, IPurchasableOffer } from '../../api';

export const normalizeCatalogType = (type?: string): string => {
    if (type === CatalogType.BUILDER) return CatalogType.BUILDER;

    return CatalogType.NORMAL;
};

export interface CatalogIndexRequestCoordinator {
    request: (catalogType: string) => boolean;
    complete: (catalogType: string) => void;
    reset: () => void;
}

export interface CatalogIndexPrewarmState {
    authenticated: boolean;
    visible: boolean;
    hasIndex: boolean;
    catalogType: string;
}

export interface CatalogIndexPrewarmController {
    update: (state: CatalogIndexPrewarmState) => void;
}

export const createCatalogIndexRequestCoordinator = (
    send: (catalogType: string) => void,
    timeoutMs: number = 10_000,
    now: () => number = Date.now
): CatalogIndexRequestCoordinator => {
    const requestedAt = new Map<string, number>();

    return {
        request: (catalogType) => {
            const requested = requestedAt.get(catalogType);
            const currentTime = now();

            if (requested !== undefined && currentTime - requested < timeoutMs) return false;

            requestedAt.set(catalogType, currentTime);
            send(catalogType);

            return true;
        },
        complete: (catalogType) => requestedAt.delete(catalogType),
        reset: () => requestedAt.clear()
    };
};

export const createCatalogIndexPrewarmController = (request: (catalogType: string) => void): CatalogIndexPrewarmController => {
    let previous: CatalogIndexPrewarmState = {
        authenticated: false,
        visible: false,
        hasIndex: false,
        catalogType: CatalogType.NORMAL
    };

    return {
        update: (state) => {
            if (state.authenticated) {
                const authenticatedNow = !previous.authenticated;
                const openedNow = state.visible && !previous.visible;
                const switchedVisibleCatalog = state.visible && state.catalogType !== previous.catalogType;

                if (openedNow || switchedVisibleCatalog) request(state.catalogType);
                else if (authenticatedNow) scheduleWhenIdle(() => request(state.catalogType));
            }

            previous = state;
        }
    };
};

const scheduleWhenIdle = (run: () => void): void => {
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback;

    if (typeof idle === 'function') idle(run, { timeout: 5000 });
    else setTimeout(run, 1000);
};

export const restoreCatalogActivePath = (rootNode: ICatalogNode, activePageId: number): ICatalogNode[] => {
    const target = findNodeById(activePageId, rootNode, rootNode);
    if (!target) return [];

    const path: ICatalogNode[] = [];
    let node: ICatalogNode | null = target;

    while (node && node !== rootNode) {
        path.unshift(node);
        node = node.parent;
    }

    for (const activeNode of path) {
        activeNode.activate();
        activeNode.open();
    }

    return path;
};

export const isCurrentCatalogPageResponse = (requestedPageId: number, responsePageId: number): boolean => requestedPageId === responsePageId;

export interface CatalogPageRequestCorrelation {
    request: (pageId: number, onTimeout?: (pageId: number) => void, timeoutMs?: number) => void;
    reset: () => void;
    matches: (responsePageId: number) => boolean;
    complete: (responsePageId: number) => boolean;
}

export const createCatalogPageRequestCorrelation = (): CatalogPageRequestCorrelation => {
    let requestedPageId = -1;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const clearRequest = () => {
        if (timeout) clearTimeout(timeout);

        timeout = null;
        requestedPageId = -1;
    };

    return {
        request: (pageId, onTimeout, timeoutMs = 10000) => {
            clearRequest();
            requestedPageId = pageId;

            if (onTimeout) {
                timeout = setTimeout(() => {
                    timeout = null;
                    onTimeout(requestedPageId);
                }, timeoutMs);
            }
        },
        reset: clearRequest,
        matches: (responsePageId) => isCurrentCatalogPageResponse(requestedPageId, responsePageId),
        complete: (responsePageId) => {
            if (!isCurrentCatalogPageResponse(requestedPageId, responsePageId)) return false;

            clearRequest();

            return true;
        }
    };
};

export const getOfferProductKeys = (offer: IPurchasableOffer | null | undefined): string[] => {
    const keys: string[] = [];
    const product = offer?.product;

    if (!product) return keys;

    if (product.productType && product.productClassId >= 0) {
        keys.push(`${product.productType}:id:${product.productClassId}`);
    }

    if (product.productType && product.furnitureData?.className?.length) {
        keys.push(`${product.productType}:class:${product.furnitureData.className}`);
    }

    return keys;
};

export const findNodeById = (id: number, node: ICatalogNode | null, rootNode: ICatalogNode | null): ICatalogNode | null => {
    if (!node) return null;
    if (node.pageId === id && node !== rootNode) return node;

    for (const child of node.children) {
        const found = findNodeById(id, child, rootNode);

        if (found) return found;
    }

    return null;
};

export const findNodeByName = (name: string, node: ICatalogNode | null, rootNode: ICatalogNode | null): ICatalogNode | null => {
    if (!node) return null;
    if (node.pageName === name && node !== rootNode) return node;

    for (const child of node.children) {
        const found = findNodeByName(name, child, rootNode);

        if (found) return found;
    }

    return null;
};

export const getNodesByOfferIdFromMap = (
    offerId: number,
    offersToNodes: Map<number, ICatalogNode[]> | null | undefined,
    onlyVisible: boolean = false
): ICatalogNode[] | null => {
    if (!offersToNodes || !offersToNodes.size) return null;

    if (onlyVisible) {
        const offers = offersToNodes.get(offerId);
        const visible: ICatalogNode[] = [];

        if (offers && offers.length) {
            for (const offer of offers) {
                if (offer.isVisible) visible.push(offer);
            }
        }

        if (visible.length) return visible;
    }

    return offersToNodes.get(offerId) ?? null;
};

export const buildCatalogNodeTree = (root: NodeData): { rootNode: ICatalogNode; offersToNodes: Map<number, ICatalogNode[]> } => {
    const offersToNodes: Map<number, ICatalogNode[]> = new Map();

    const walk = (node: NodeData, depth: number, parent: ICatalogNode | null): ICatalogNode => {
        const catalogNode = new CatalogNode(node, depth, parent) as ICatalogNode;

        for (const offerId of catalogNode.offerIds) {
            const existing = offersToNodes.get(offerId);

            if (existing) existing.push(catalogNode);
            else offersToNodes.set(offerId, [catalogNode]);
        }

        for (const child of node.children) catalogNode.addChild(walk(child, depth + 1, catalogNode));

        return catalogNode;
    };

    return { rootNode: walk(root, 0, null), offersToNodes };
};

export interface BuilderPlacementStatusInput {
    offer: IPurchasableOffer | null | undefined;
    roomSession: { isGuildRoom: boolean; isRoomOwner: boolean; controllerLevel: number } | null;
    secondsLeft: number;
    furniCount: number;
    furniLimit: number;
    builderPlacementAllowedInCurrentRoom: boolean;
    builderPlacementBlockedByVisitors: boolean;
    visitorCount?: number;
}

export const resolveBuilderFurniPlaceableStatus = (input: BuilderPlacementStatusInput): BuilderFurniPlaceableStatus => {
    const {
        offer,
        roomSession,
        secondsLeft,
        furniCount,
        furniLimit,
        builderPlacementAllowedInCurrentRoom,
        builderPlacementBlockedByVisitors,
        visitorCount = 0
    } = input;

    if (!offer) return BuilderFurniPlaceableStatus.MISSING_OFFER;

    if (!roomSession) return BuilderFurniPlaceableStatus.NOT_IN_ROOM;

    const canUseGuildAdminFallback = roomSession.isGuildRoom && roomSession.controllerLevel >= RoomControllerLevel.GUILD_ADMIN && secondsLeft > 0;

    const usesSharedPlacementPool = !roomSession.isRoomOwner && (builderPlacementAllowedInCurrentRoom || canUseGuildAdminFallback);

    if (!roomSession.isRoomOwner && !builderPlacementAllowedInCurrentRoom && !canUseGuildAdminFallback) {
        return BuilderFurniPlaceableStatus.NOT_GROUP_ADMIN;
    }

    if (!usesSharedPlacementPool && (furniCount < 0 || furniCount >= furniLimit)) {
        return BuilderFurniPlaceableStatus.FURNI_LIMIT_REACHED;
    }

    if (secondsLeft <= 0 && builderPlacementBlockedByVisitors) {
        return BuilderFurniPlaceableStatus.VISITORS_IN_ROOM;
    }

    if (secondsLeft <= 0 && visitorCount > 0) {
        return BuilderFurniPlaceableStatus.VISITORS_IN_ROOM;
    }

    return BuilderFurniPlaceableStatus.OKAY;
};

export const replaceCatalogPageOffers = (page: ICatalogPage, offers: IPurchasableOffer[]): CatalogPage => {
    return new CatalogPage(page.pageId, page.layoutCode, page.localization, offers, page.acceptSeasonCurrencyAsCredits, page.mode);
};

export { RoomControllerLevel, RoomObjectCategory, RoomObjectType };
