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

/**
 * The first page named `name` under `node`, depth first. A path (`clothing/effects`) finds each name under the
 * page found for the one before it, for a page name the catalogue uses more than once.
 */
export const findNodeByName = (name: string, node: ICatalogNode | null, rootNode: ICatalogNode | null): ICatalogNode | null => {
    if (!node) return null;

    if (name?.includes('/')) {
        let found: ICatalogNode | null = node;

        for (const part of name.split('/').filter((segment) => segment.length)) {
            found = findNodeByName(part, found, found === node ? rootNode : found);

            if (!found) return null;
        }

        return found === node ? null : found;
    }

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

/**
 * The catalog page a purchase of this offer names: the offer's own page, or - for an offer opened from a search or
 * a link, whose page is a placeholder - the first page that holds it. The page on screen is not it: the server
 * refuses an offer that is not on the page named.
 */
export const resolveOfferPageId = (offer: IPurchasableOffer, offersToNodes: Map<number, ICatalogNode[]> | null | undefined): number => {
    const pageId = offer?.page?.pageId ?? -1;

    if (pageId >= 0) return pageId;

    const nodes = getNodesByOfferIdFromMap(offer?.offerId, offersToNodes, true) || getNodesByOfferIdFromMap(offer?.offerId, offersToNodes);

    return nodes?.length ? nodes[0].pageId : -1;
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
    /** Playtest refuses Builders Club placement (the hotel's own rule beyond AIR), as the server does. */
    playTestRestricted?: boolean;
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
        visitorCount = 0,
        playTestRestricted = false
    } = input;

    if (!offer) return BuilderFurniPlaceableStatus.MISSING_OFFER;

    if (!roomSession) return BuilderFurniPlaceableStatus.NOT_IN_ROOM;

    if (playTestRestricted) return BuilderFurniPlaceableStatus.NOT_ROOM_OWNER;

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
