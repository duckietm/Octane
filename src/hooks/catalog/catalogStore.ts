import { CreateLinkEvent, FrontPageItem, GetRoomEngine, GetSessionDataManager, RoomObjectPlacementSource, RoomObjectVariable, RoomPreviewer } from '@octane/renderer';
import {
    BuilderFurniPlaceableStatus,
    CatalogType,
    GetRoomSession,
    ICatalogNode,
    ICatalogPage,
    IPurchasableOffer,
    IPurchaseOptions,
    Offer,
    PlacedObjectPurchaseData,
    ProductTypeEnum,
    SearchResult
} from '../../api';
import { createOctaneStore } from '../../state/createOctaneStore';
import {
    findNodeById,
    findNodeByName,
    getNodesByOfferIdFromMap,
    normalizeCatalogType,
    replaceCatalogPageOffers,
    resolveBuilderFurniPlaceableStatus,
    RoomControllerLevel,
    RoomObjectCategory,
    RoomObjectType
} from './useCatalog.helpers';
import { invalidateCatalogIndex, invalidateCatalogPage, readCatalogIndex, refetchCatalogPage } from './useCatalogQueries';

export const DUMMY_PAGE_ID_FOR_OFFER_SEARCH = -12345678;
const DRAG_AND_DROP_ENABLED = true;

export type CatalogPendingRequest = { kind: 'id'; id: number } | { kind: 'name'; name: string } | { kind: 'offer'; offerId: number };

const DEFAULT_PURCHASE_OPTIONS: IPurchaseOptions = { quantity: 1, extraData: null, extraParamRequired: false, previewStuffData: null };

export interface CatalogUiState {
    isVisible: boolean;
    currentType: string;
    pageId: number;
    previousPageId: number;
    activeNodes: ICatalogNode[];
    pendingRequest: CatalogPendingRequest | null;
    pendingOfferId: number;
    pageOverride: ICatalogPage | null;
    currentOffer: IPurchasableOffer | null;
    searchResult: SearchResult | null;
    frontPageItems: FrontPageItem[];
    navigationHidden: boolean;
    purchaseOptions: IPurchaseOptions;
    giftReceiver: string | null;
    catalogPlaceMultipleObjects: boolean;
    catalogLocalizationVersion: number;
    roomPreviewer: RoomPreviewer | null;
    objectMoverRequested: boolean;
    purchasableOffer: IPurchasableOffer | null;
    placedObjectPurchaseData: PlacedObjectPurchaseData | null;
    furniCount: number;
    furniLimit: number;
    maxFurniLimit: number;
    secondsLeft: number;
    updateTime: number;
    secondsLeftWithGrace: number;
    builderPlacementBlockedByVisitors: boolean;
    builderPlacementAllowedInCurrentRoom: boolean;
    builderTrialRoomHideConfirmed: boolean;
}

export interface CatalogActions {
    setIsVisible: (visible: boolean | ((previous: boolean) => boolean)) => void;
    openCatalogByType: (type?: string) => void;
    toggleCatalogByType: (type?: string) => void;
    activateNode: (node: ICatalogNode, offerId?: number) => void;
    openPageById: (id: number) => void;
    openPageByName: (name: string) => void;
    openPageByOfferId: (offerId: number) => void;
    resolvePendingRequest: () => void;
    getNodeById: (id: number, node: ICatalogNode) => ICatalogNode | null;
    getNodeByName: (name: string, node: ICatalogNode) => ICatalogNode | null;
    getNodesByOfferId: (offerId: number, onlyVisible?: boolean) => ICatalogNode[] | null;
    setCurrentPage: (page: ICatalogPage | null) => void;
    setCurrentOffer: (offer: IPurchasableOffer | null) => void;
    selectCatalogOffer: (offer: IPurchasableOffer) => void;
    consumePendingOffer: (page: ICatalogPage) => void;
    setSearchResult: (result: SearchResult | null) => void;
    setFrontPageItems: (items: FrontPageItem[]) => void;
    setNavigationHidden: (hidden: boolean) => void;
    setPurchaseOptions: (options: IPurchaseOptions | ((previous: IPurchaseOptions) => IPurchaseOptions)) => void;
    setGiftReceiver: (receiver: string | null) => void;
    setCatalogPlaceMultipleObjects: (flag: boolean) => void;
    bumpLocalizationVersion: () => void;
    setRoomPreviewer: (previewer: RoomPreviewer | null) => void;
    setBuildersClubFurniCount: (furniCount: number) => void;
    setBuildersClubSubscription: (status: {
        furniLimit: number;
        maxFurniLimit: number;
        secondsLeft: number;
        updateTime: number;
        secondsLeftWithGrace: number;
        placementBlockedByVisitors: boolean;
        placementAllowedInCurrentRoom: boolean;
    }) => void;
    setBuilderTrialRoomHideConfirmed: (flag: boolean) => void;
    getBuilderFurniPlaceableStatus: (offer: IPurchasableOffer) => BuilderFurniPlaceableStatus;
    isDraggable: (offer: IPurchasableOffer) => boolean;
    requestOfferToMover: (offer: IPurchasableOffer) => void;
    cancelObjectMover: () => void;
    resetObjectMover: (flag?: boolean) => void;
    setPlacedObjectPurchaseData: (data: PlacedObjectPurchaseData | null) => void;
    resetPlacedOfferData: (flag?: boolean) => void;
    resetRoomPaint: (planeType: string, type: string) => void;
    refreshIndex: () => void;
    refreshCurrentPage: () => void;
    retryCurrentPage: () => void;
    resetVisibleCatalogState: (type?: string) => void;
}

export type CatalogStoreState = CatalogUiState & CatalogActions;

export const INITIAL_CATALOG_UI_STATE: CatalogUiState = {
    isVisible: false,
    currentType: CatalogType.NORMAL,
    pageId: -1,
    previousPageId: -1,
    activeNodes: [],
    pendingRequest: null,
    pendingOfferId: -1,
    pageOverride: null,
    currentOffer: null,
    searchResult: null,
    frontPageItems: [],
    navigationHidden: false,
    purchaseOptions: DEFAULT_PURCHASE_OPTIONS,
    giftReceiver: null,
    catalogPlaceMultipleObjects: false,
    catalogLocalizationVersion: 0,
    roomPreviewer: null,
    objectMoverRequested: false,
    purchasableOffer: null,
    placedObjectPurchaseData: null,
    furniCount: 0,
    furniLimit: 0,
    maxFurniLimit: 0,
    secondsLeft: 0,
    updateTime: 0,
    secondsLeftWithGrace: 0,
    builderPlacementBlockedByVisitors: false,
    builderPlacementAllowedInCurrentRoom: false,
    builderTrialRoomHideConfirmed: false
};

const pathToRoot = (target: ICatalogNode): ICatalogNode[] => {
    const nodes: ICatalogNode[] = [];
    let node: ICatalogNode | null = target;

    while (node && node.pageName !== 'root') {
        nodes.push(node);
        node = node.parent;
    }

    return nodes.reverse();
};

export const useCatalogStore = createOctaneStore<CatalogStoreState>((set, get) => ({
    ...INITIAL_CATALOG_UI_STATE,

    setIsVisible: (visible) => set((state) => ({ isVisible: typeof visible === 'function' ? visible(state.isVisible) : visible })),

    resetVisibleCatalogState: (type) =>
        set({
            pageId: -1,
            previousPageId: -1,
            activeNodes: [],
            pendingRequest: null,
            pendingOfferId: -1,
            pageOverride: null,
            currentOffer: null,
            searchResult: null,
            frontPageItems: [],
            navigationHidden: false,
            currentType: normalizeCatalogType(type)
        }),

    openCatalogByType: (type) => {
        const catalogType = normalizeCatalogType(type);

        if (get().currentType !== catalogType) get().resetVisibleCatalogState(catalogType);

        set({ isVisible: true });
    },

    toggleCatalogByType: (type) => {
        const catalogType = normalizeCatalogType(type);
        const { isVisible, currentType } = get();

        if (isVisible && currentType === catalogType) {
            set({ isVisible: false });

            return;
        }

        if (currentType !== catalogType) get().resetVisibleCatalogState(catalogType);

        set({ isVisible: true });
    },

    activateNode: (targetNode, offerId = -1) => {
        get().cancelObjectMover();

        if (targetNode.parent && targetNode.parent.pageName === 'root' && targetNode.children.length) {
            for (const child of targetNode.children) {
                if (!child.isVisible) continue;

                targetNode = child;
                break;
            }
        }

        const nodes = pathToRoot(targetNode);
        const previous = get().activeNodes;
        const wasActive = previous.indexOf(targetNode) >= 0;
        const wasOpen = targetNode.isOpen;

        for (const existing of previous) {
            existing.deactivate();

            if (nodes.indexOf(existing) === -1) existing.close();
        }

        for (const node of nodes) {
            node.activate();

            if (node.parent) node.open();

            if (node === targetNode.parent && node.children.length) node.open();
        }

        if (wasActive && wasOpen) targetNode.close();
        else targetNode.open();

        const pageId = targetNode.pageId;

        set((state) => ({
            activeNodes: nodes,
            pageId: pageId > -1 ? pageId : state.pageId,
            previousPageId: pageId > -1 ? pageId : state.previousPageId,
            pendingOfferId: offerId,
            pageOverride: null,
            currentOffer: null,
            navigationHidden: false
        }));
    },

    getNodeById: (id, node) => findNodeById(id, node, readCatalogIndex(get().currentType)?.rootNode ?? null),

    getNodeByName: (name, node) => findNodeByName(name, node, readCatalogIndex(get().currentType)?.rootNode ?? null),

    getNodesByOfferId: (offerId, onlyVisible = false) => getNodesByOfferIdFromMap(offerId, readCatalogIndex(get().currentType)?.offersToNodes, onlyVisible),

    openPageById: (id) => {
        if (id !== -1) set({ searchResult: null });

        const index = readCatalogIndex(get().currentType);

        if (!get().isVisible || !index) {
            set({ pendingRequest: { kind: 'id', id }, isVisible: true });

            return;
        }

        const node = findNodeById(id, index.rootNode, index.rootNode);

        if (node) get().activateNode(node);
    },

    openPageByName: (name) => {
        set({ searchResult: null });

        const index = readCatalogIndex(get().currentType);

        if (!get().isVisible || !index) {
            set({ pendingRequest: { kind: 'name', name }, isVisible: true });

            return;
        }

        const node = findNodeByName(name, index.rootNode, index.rootNode);

        if (node) get().activateNode(node);
    },

    openPageByOfferId: (offerId) => {
        set({ searchResult: null });

        const index = readCatalogIndex(get().currentType);

        if (!get().isVisible || !index) {
            set({ pendingRequest: { kind: 'offer', offerId }, isVisible: true });

            return;
        }

        const nodes = getNodesByOfferIdFromMap(offerId, index.offersToNodes);

        if (!nodes || !nodes.length) return;

        get().activateNode(nodes[0], offerId);
    },

    resolvePendingRequest: () => {
        const { isVisible, pendingRequest, pageId, pageOverride, currentType } = get();
        const index = readCatalogIndex(currentType);

        if (!isVisible || !index) return;

        if (pendingRequest) {
            set({ pendingRequest: null });

            switch (pendingRequest.kind) {
                case 'id':
                    get().openPageById(pendingRequest.id);
                    return;
                case 'name':
                    get().openPageByName(pendingRequest.name);
                    return;
                case 'offer':
                    get().openPageByOfferId(pendingRequest.offerId);
                    return;
            }
        }

        if (pageId > -1 || pageOverride) return;

        if (index.rootNode.isBranch) {
            for (const child of index.rootNode.children) {
                if (child && child.isVisible) {
                    get().activateNode(child);

                    return;
                }
            }
        }
    },

    setCurrentPage: (page) => set({ pageOverride: page }),

    setCurrentOffer: (offer) => set({ currentOffer: offer, purchaseOptions: offer ? { ...DEFAULT_PURCHASE_OPTIONS } : get().purchaseOptions }),

    selectCatalogOffer: (offer) => {
        if (!offer) return;

        // Matches the old hook's effective behaviour: it used to set
        // purchaseOptions.extraData from the WALL product's extraParam here,
        // but the reset effect that ran right after always overwrote it back
        // to the defaults before the purchase payload was ever read - so the
        // wire-visible value was always null. Keep that outcome explicitly
        // rather than reintroducing the now-dead assignment.
        const purchaseOptions: IPurchaseOptions = { ...DEFAULT_PURCHASE_OPTIONS };

        set({ currentOffer: offer, purchaseOptions });

        if (offer.isLazy && offer.offerId > -1) offer.activate();
    },

    consumePendingOffer: (page) => {
        const { pendingOfferId } = get();

        if (pendingOfferId <= -1) return;

        set({ pendingOfferId: -1 });

        for (const offer of page.offers) {
            if (offer.offerId !== pendingOfferId) continue;

            get().selectCatalogOffer(offer);
            break;
        }
    },

    setSearchResult: (result) => {
        const { pageOverride, previousPageId } = get();

        set({ searchResult: result });

        if (!result && pageOverride && pageOverride.pageId === -1) {
            set({ pageOverride: null });
            get().openPageById(previousPageId);
        }
    },

    setFrontPageItems: (items) => set({ frontPageItems: items }),
    setNavigationHidden: (navigationHidden) => set({ navigationHidden }),
    setPurchaseOptions: (options) => set((state) => ({ purchaseOptions: typeof options === 'function' ? options(state.purchaseOptions) : options })),
    setGiftReceiver: (giftReceiver) => set({ giftReceiver }),
    setCatalogPlaceMultipleObjects: (catalogPlaceMultipleObjects) => set({ catalogPlaceMultipleObjects }),
    bumpLocalizationVersion: () =>
        set((state) => ({
            catalogLocalizationVersion: state.catalogLocalizationVersion + 1,
            currentOffer: state.currentOffer?.clone ? state.currentOffer.clone() : state.currentOffer,
            pageOverride: state.pageOverride
                ? replaceCatalogPageOffers(
                      state.pageOverride,
                      state.pageOverride.offers.map((offer) => (offer?.clone ? offer.clone() : offer))
                  )
                : state.pageOverride
        })),
    setRoomPreviewer: (roomPreviewer) => set({ roomPreviewer }),

    setBuildersClubFurniCount: (furniCount) => set({ furniCount }),
    setBuildersClubSubscription: (status) =>
        set({
            furniLimit: status.furniLimit,
            maxFurniLimit: status.maxFurniLimit,
            secondsLeft: status.secondsLeft,
            updateTime: status.updateTime,
            secondsLeftWithGrace: status.secondsLeftWithGrace,
            builderPlacementBlockedByVisitors: status.placementBlockedByVisitors,
            builderPlacementAllowedInCurrentRoom: status.placementAllowedInCurrentRoom,
            builderTrialRoomHideConfirmed: status.secondsLeft > 0 ? false : get().builderTrialRoomHideConfirmed
        }),
    setBuilderTrialRoomHideConfirmed: (builderTrialRoomHideConfirmed) => set({ builderTrialRoomHideConfirmed }),

    getBuilderFurniPlaceableStatus: (offer) => {
        const { secondsLeft, furniCount, furniLimit, builderPlacementAllowedInCurrentRoom, builderPlacementBlockedByVisitors } = get();
        const roomSession = GetRoomSession();

        let visitorCount = 0;

        if (roomSession && secondsLeft <= 0 && !builderPlacementBlockedByVisitors) {
            const roomEngine = GetRoomEngine();
            const userDataManager = roomSession.userDataManager;
            const sessionDataManager = GetSessionDataManager();

            if (roomEngine && userDataManager && sessionDataManager) {
                const roomObjects = roomEngine.getRoomObjects(roomSession.roomId, RoomObjectCategory.UNIT);

                if (roomObjects && roomObjects.length) {
                    for (const roomObject of roomObjects) {
                        if (!roomObject) continue;

                        const userData = userDataManager.getUserDataByIndex(roomObject.id);

                        if (!userData || userData.type !== RoomObjectType.USER) continue;
                        if (userData.webID === sessionDataManager.userId) continue;
                        if (userData.isModerator) continue;

                        visitorCount++;
                        break;
                    }
                }
            }
        }

        return resolveBuilderFurniPlaceableStatus({
            offer,
            roomSession: roomSession
                ? { isGuildRoom: roomSession.isGuildRoom, isRoomOwner: roomSession.isRoomOwner, controllerLevel: roomSession.controllerLevel }
                : null,
            secondsLeft,
            furniCount,
            furniLimit,
            builderPlacementAllowedInCurrentRoom,
            builderPlacementBlockedByVisitors,
            visitorCount
        });
    },

    isDraggable: (offer) => {
        const roomSession = GetRoomSession();
        const { currentType } = get();

        return (
            ((DRAG_AND_DROP_ENABLED &&
                roomSession &&
                offer.page &&
                offer.page.layoutCode !== 'sold_ltd_items' &&
                currentType === CatalogType.NORMAL &&
                (roomSession.isRoomOwner || (roomSession.isGuildRoom && roomSession.controllerLevel >= RoomControllerLevel.GUILD_MEMBER))) ||
                (currentType === CatalogType.BUILDER && get().getBuilderFurniPlaceableStatus(offer) === BuilderFurniPlaceableStatus.OKAY)) &&
            offer.pricingModel !== Offer.PRICING_MODEL_BUNDLE &&
            offer.product.productType !== ProductTypeEnum.EFFECT &&
            offer.product.productType !== ProductTypeEnum.HABBO_CLUB
        );
    },

    requestOfferToMover: (offer) => {
        if (!get().isDraggable(offer)) return;

        const product = offer.product;

        if (!product) return;

        let category = 0;

        switch (product.productType) {
            case ProductTypeEnum.FLOOR:
                category = RoomObjectCategory.FLOOR;
                break;
            case ProductTypeEnum.WALL:
                category = RoomObjectCategory.WALL;
                break;
        }

        if (GetRoomEngine().processRoomObjectPlacement(RoomObjectPlacementSource.CATALOG, -offer.offerId, category, product.productClassId, product.extraParam)) {
            set({ purchasableOffer: offer, objectMoverRequested: true, isVisible: false });
        }
    },

    cancelObjectMover: () => {
        if (!get().purchasableOffer) return;

        GetRoomEngine().cancelRoomObjectInsert();

        set({ objectMoverRequested: false, purchasableOffer: null });
    },

    resetObjectMover: (flag = true) => {
        if (get().objectMoverRequested && flag) CreateLinkEvent('catalog/open');

        set({ objectMoverRequested: false });
    },

    setPlacedObjectPurchaseData: (placedObjectPurchaseData) => set({ placedObjectPurchaseData }),

    resetRoomPaint: (planeType, type) => {
        const roomEngine = GetRoomEngine();

        let wallType = roomEngine.getRoomInstanceVariable<string>(roomEngine.activeRoomId, RoomObjectVariable.ROOM_WALL_TYPE);
        let floorType = roomEngine.getRoomInstanceVariable<string>(roomEngine.activeRoomId, RoomObjectVariable.ROOM_FLOOR_TYPE);
        let landscapeType = roomEngine.getRoomInstanceVariable<string>(roomEngine.activeRoomId, RoomObjectVariable.ROOM_LANDSCAPE_TYPE);

        wallType = wallType && wallType.length ? wallType : '101';
        floorType = floorType && floorType.length ? floorType : '101';
        landscapeType = landscapeType && landscapeType.length ? landscapeType : '1.1';

        switch (planeType) {
            case 'floor':
                roomEngine.updateRoomInstancePlaneType(roomEngine.activeRoomId, type, wallType, landscapeType, true);
                return;
            case 'wallpaper':
                roomEngine.updateRoomInstancePlaneType(roomEngine.activeRoomId, floorType, type, landscapeType, true);
                return;
            case 'landscape':
                roomEngine.updateRoomInstancePlaneType(roomEngine.activeRoomId, floorType, wallType, type, true);
                return;
            default:
                roomEngine.updateRoomInstancePlaneType(roomEngine.activeRoomId, floorType, wallType, landscapeType, true);
                return;
        }
    },

    resetPlacedOfferData: (flag = false) => {
        if (!flag) get().resetObjectMover();

        const previous = get().placedObjectPurchaseData;

        if (previous) {
            switch (previous.category) {
                case RoomObjectCategory.FLOOR:
                    GetRoomEngine().removeRoomObjectFloor(previous.roomId, previous.objectId);
                    break;
                case RoomObjectCategory.WALL:
                    switch (previous.furniData.className) {
                        case 'floor':
                        case 'wallpaper':
                        case 'landscape':
                            get().resetRoomPaint('reset', '');
                            break;
                        default:
                            GetRoomEngine().removeRoomObjectWall(previous.roomId, previous.objectId);
                            break;
                    }
                    break;
                default:
                    GetRoomEngine().deleteRoomObject(previous.objectId, previous.category);
                    break;
            }
        }

        set({ placedObjectPurchaseData: null });
    },

    refreshIndex: () => invalidateCatalogIndex(get().currentType),

    refreshCurrentPage: () => {
        const { currentType, pageId } = get();

        if (pageId > -1) invalidateCatalogPage(currentType, pageId);
    },

    retryCurrentPage: () => {
        const { currentType, pageId } = get();

        if (pageId > -1) refetchCatalogPage(currentType, pageId);
    }
}));
