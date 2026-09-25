import { NodeData, RoomControllerLevel, RoomObjectCategory, RoomObjectType } from '@octane/renderer';
import { BuilderFurniPlaceableStatus, CatalogNode, CatalogPage, CatalogType, ICatalogNode, ICatalogPage, IPurchasableOffer } from '../../api';

export const normalizeCatalogType = (type?: string): string => {
    if (type === CatalogType.BUILDER) return CatalogType.BUILDER;

    return CatalogType.NORMAL;
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
