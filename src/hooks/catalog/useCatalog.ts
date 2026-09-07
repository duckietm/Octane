import {
    BuildersClubFurniCountMessageEvent,
    BuildersClubPlaceRoomItemMessageComposer,
    BuildersClubPlaceWallItemMessageComposer,
    BuildersClubQueryFurniCountMessageComposer,
    BuildersClubSubscriptionStatusMessageEvent,
    CatalogPageMessageEvent,
    CatalogPagesListEvent,
    CatalogPublishedMessageEvent,
    CreateLinkEvent,
    FrontPageItem,
    FurniturePlaceComposer,
    FurniturePlacePaintComposer,
    GetCatalogIndexComposer,
    GetCatalogPageComposer,
    GetConfiguration,
    GetRoomContentLoader,
    GetRoomEngine,
    GetSessionDataManager,
    GetTickerTime,
    LegacyDataType,
    LimitedEditionSoldOutEvent,
    MarketplaceMakeOfferResult,
    ProductOfferEvent,
    PurchaseErrorMessageEvent,
    PurchaseFromCatalogComposer,
    PurchaseNotAllowedMessageEvent,
    PurchaseOKMessageEvent,
    RoomEngineObjectPlacedEvent,
    RoomObjectPlacementSource,
    RoomObjectVariable,
    RoomPreviewer,
    Vector3d
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    BuilderFurniPlaceableStatus,
    CatalogPage,
    CatalogType,
    DispatchUiEvent,
    FurniCategory,
    GetFurnitureData,
    GetProductDataForLocalization,
    GetRoomSession,
    ICatalogNode,
    ICatalogPage,
    IPageLocalization,
    IProduct,
    IPurchasableOffer,
    IPurchaseOptions,
    LocalizeText,
    NotificationAlertType,
    Offer,
    PageLocalization,
    PlacedObjectPurchaseData,
    PlaySound,
    Product,
    ProductTypeEnum,
    RequestedPage,
    SearchResult,
    SendMessageComposer,
    SoundNames
} from '../../api';
import {
    CatalogPurchasedEvent,
    CatalogPurchaseFailureEvent,
    CatalogPurchaseNotAllowedEvent,
    CatalogPurchaseSoldOutEvent,
    InventoryFurniAddedEvent
} from '../../events';
import { useConnectionState, useMessageEvent, useOctaneEvent, useUiEvent } from '../events';
import { useNotification } from '../notification';
import {
    buildCatalogNodeTree,
    createCatalogIndexPrewarmController,
    createCatalogIndexRequestCoordinator,
    createCatalogPageRequestCorrelation,
    findNodeById,
    findNodeByName,
    getNodesByOfferIdFromMap,
    getOfferProductKeys,
    normalizeCatalogType,
    RoomControllerLevel,
    RoomObjectCategory,
    RoomObjectType,
    resolveBuilderFurniPlaceableStatus,
    restoreCatalogActivePath
} from './useCatalog.helpers';
import { useCatalogPlaceMultipleItems } from './useCatalogPlaceMultipleItems';
import { useCatalogSkipPurchaseConfirmation } from './useCatalogSkipPurchaseConfirmation';

const DUMMY_PAGE_ID_FOR_OFFER_SEARCH = -12345678;
const DRAG_AND_DROP_ENABLED = true;

const useCatalogStore = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [catalogLoadError, setCatalogLoadError] = useState<'timeout' | null>(null);
    const [pageId, setPageId] = useState(-1);
    const [previousPageId, setPreviousPageId] = useState(-1);
    const [currentType, setCurrentType] = useState(CatalogType.NORMAL);
    const [rootNode, setRootNode] = useState<ICatalogNode>(null);
    const [offersToNodes, setOffersToNodes] = useState<Map<number, ICatalogNode[]>>(null);
    const [currentPage, setCurrentPage] = useState<ICatalogPage>(null);
    const [currentOffer, setCurrentOffer] = useState<IPurchasableOffer>(null);
    const [activeNodes, setActiveNodes] = useState<ICatalogNode[]>([]);
    const [searchResult, setSearchResult] = useState<SearchResult>(null);
    const [frontPageItems, setFrontPageItems] = useState<FrontPageItem[]>([]);
    const [roomPreviewer, setRoomPreviewer] = useState<RoomPreviewer>(null);
    const [navigationHidden, setNavigationHidden] = useState(false);
    const [purchaseOptions, setPurchaseOptions] = useState<IPurchaseOptions>({
        quantity: 1,
        extraData: null,
        extraParamRequired: false,
        previewStuffData: null
    });
    const [giftReceiver, setGiftReceiver] = useState<string>(null);
    const [objectMoverRequested, setObjectMoverRequested] = useState(false);
    const [catalogPlaceMultipleObjects, setCatalogPlaceMultipleObjects] = useCatalogPlaceMultipleItems();
    const [catalogSkipPurchaseConfirmation, setCatalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const [purchasableOffer, setPurchaseableOffer] = useState<IPurchasableOffer>(null);
    const [placedObjectPurchaseData, setPlacedObjectPurchaseData] = useState<PlacedObjectPurchaseData>(null);
    const [furniCount, setFurniCount] = useState(0);
    const [furniLimit, setFurniLimit] = useState(0);
    const [maxFurniLimit, setMaxFurniLimit] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [updateTime, setUpdateTime] = useState(0);
    const [secondsLeftWithGrace, setSecondsLeftWithGrace] = useState(0);
    const [catalogLocalizationVersion, setCatalogLocalizationVersion] = useState(0);
    const [builderPlacementBlockedByVisitors, setBuilderPlacementBlockedByVisitors] = useState(false);
    const [builderPlacementAllowedInCurrentRoom, setBuilderPlacementAllowedInCurrentRoom] = useState(false);
    const [builderTrialRoomHideConfirmed, setBuilderTrialRoomHideConfirmed] = useState(false);
    const resolvedOffersByProductKey = useRef<Map<string, IPurchasableOffer>>(new Map());
    const pageRequestCorrelation = useRef(createCatalogPageRequestCorrelation());
    const { simpleAlert = null, showConfirm = null } = useNotification();
    const requestedPage = useRef(new RequestedPage());
    const connectionState = useConnectionState();
    const catalogIndexRequests = useRef<ReturnType<typeof createCatalogIndexRequestCoordinator>>(null);
    const catalogIndexPrewarm = useRef<ReturnType<typeof createCatalogIndexPrewarmController>>(null);

    if (!catalogIndexRequests.current) {
        catalogIndexRequests.current = createCatalogIndexRequestCoordinator((catalogType) => {
            SendMessageComposer(new GetCatalogIndexComposer(catalogType));
        });
    }

    if (!catalogIndexPrewarm.current) {
        catalogIndexPrewarm.current = createCatalogIndexPrewarmController((catalogType) => catalogIndexRequests.current.request(catalogType));
    }

    const resetVisibleCatalogState = useCallback((type?: string) => {
        requestedPage.current.resetRequest();
        pageRequestCorrelation.current.reset();
        setIsBusy(false);
        setCatalogLoadError(null);

        setPageId(-1);
        setPreviousPageId(-1);
        setRootNode(null);
        setOffersToNodes(null);
        setCurrentPage(null);
        setCurrentOffer(null);
        resolvedOffersByProductKey.current.clear();
        setActiveNodes([]);
        setSearchResult(null);
        setFrontPageItems([]);
        setNavigationHidden(false);
        setCurrentType(normalizeCatalogType(type));
    }, []);

    const importedFurnidataMerged = useRef(false);

    const refreshImportedFurnidata = useCallback((force: boolean = false) => {
        if (!force && importedFurnidataMerged.current) return;

        try {
            const base = GetConfiguration().getValue<string>('furnidata.url');

            if (!base || !base.length) return;

            const importedUrl = base.replace(/\/+$/, '') + '/custom/imported.jsonc';

            GetSessionDataManager()
                .mergeFurnitureDataFromUrl(importedUrl)
                .then((added) => {
                    importedFurnidataMerged.current = true;

                    if (added && added.length) GetRoomContentLoader().processFurnitureData(added);
                })
                .catch(() => {});
        } catch {}
    }, []);

    const openCatalogByType = useCallback(
        (type?: string) => {
            const catalogType = normalizeCatalogType(type);

            if (currentType !== catalogType) {
                resetVisibleCatalogState(catalogType);
            }

            refreshImportedFurnidata();

            setIsVisible(true);
        },
        [currentType, resetVisibleCatalogState, refreshImportedFurnidata]
    );

    const toggleCatalogByType = useCallback(
        (type?: string) => {
            const catalogType = normalizeCatalogType(type);

            if (isVisible && currentType === catalogType) {
                setIsVisible(false);

                return;
            }

            if (currentType !== catalogType) {
                resetVisibleCatalogState(catalogType);
            }

            refreshImportedFurnidata();

            setIsVisible(true);
        },
        [isVisible, currentType, resetVisibleCatalogState, refreshImportedFurnidata]
    );

    const getBuilderFurniPlaceableStatus = useCallback(
        (offer: IPurchasableOffer) => {
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
        [builderPlacementAllowedInCurrentRoom, builderPlacementBlockedByVisitors, furniCount, furniLimit, secondsLeft]
    );

    const isDraggable = useCallback(
        (offer: IPurchasableOffer) => {
            const roomSession = GetRoomSession();

            if (
                ((DRAG_AND_DROP_ENABLED &&
                    roomSession &&
                    offer.page &&
                    offer.page.layoutCode !== 'sold_ltd_items' &&
                    currentType === CatalogType.NORMAL &&
                    (roomSession.isRoomOwner || (roomSession.isGuildRoom && roomSession.controllerLevel >= RoomControllerLevel.GUILD_MEMBER))) ||
                    (currentType === CatalogType.BUILDER && getBuilderFurniPlaceableStatus(offer) === BuilderFurniPlaceableStatus.OKAY)) &&
                offer.pricingModel !== Offer.PRICING_MODEL_BUNDLE &&
                offer.product.productType !== ProductTypeEnum.EFFECT &&
                offer.product.productType !== ProductTypeEnum.HABBO_CLUB
            )
                return true;

            return false;
        },
        [currentType, getBuilderFurniPlaceableStatus]
    );

    const requestOfferToMover = useCallback(
        (offer: IPurchasableOffer) => {
            if (!isDraggable(offer)) return;

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

            if (
                GetRoomEngine().processRoomObjectPlacement(
                    RoomObjectPlacementSource.CATALOG,
                    -offer.offerId,
                    category,
                    product.productClassId,
                    product.extraParam
                )
            ) {
                setPurchaseableOffer(offer);
                setObjectMoverRequested(true);

                setIsVisible(false);
            }
        },
        [isDraggable]
    );

    const resetRoomPaint = useCallback((planeType: string, type: string) => {
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
    }, []);

    const cancelObjectMover = useCallback(() => {
        if (!purchasableOffer) return;

        GetRoomEngine().cancelRoomObjectInsert();

        setObjectMoverRequested(false);
        setPurchaseableOffer(null);
    }, [purchasableOffer]);

    const resetObjectMover = useCallback((flag: boolean = true) => {
        setObjectMoverRequested((prevValue) => {
            if (prevValue && flag) {
                CreateLinkEvent('catalog/open');
            }

            return false;
        });
    }, []);

    const resetPlacedOfferData = useCallback(
        (flag: boolean = false) => {
            if (!flag) resetObjectMover();

            setPlacedObjectPurchaseData((prevValue) => {
                if (prevValue) {
                    switch (prevValue.category) {
                        case RoomObjectCategory.FLOOR:
                            GetRoomEngine().removeRoomObjectFloor(prevValue.roomId, prevValue.objectId);
                            break;
                        case RoomObjectCategory.WALL: {
                            switch (prevValue.furniData.className) {
                                case 'floor':
                                case 'wallpaper':
                                case 'landscape':
                                    resetRoomPaint('reset', '');
                                    break;
                                default:
                                    GetRoomEngine().removeRoomObjectWall(prevValue.roomId, prevValue.objectId);
                                    break;
                            }
                            break;
                        }
                        default:
                            GetRoomEngine().deleteRoomObject(prevValue.objectId, prevValue.category);
                            break;
                    }
                }

                return null;
            });
        },
        [resetObjectMover, resetRoomPaint]
    );

    const getNodeById = useCallback((id: number, node: ICatalogNode) => findNodeById(id, node, rootNode), [rootNode]);

    const getNodeByName = useCallback((name: string, node: ICatalogNode) => findNodeByName(name, node, rootNode), [rootNode]);

    const getNodesByOfferId = useCallback((offerId: number, flag: boolean = false) => getNodesByOfferIdFromMap(offerId, offersToNodes, flag), [offersToNodes]);

    const cacheResolvedOffer = useCallback((offer: IPurchasableOffer) => {
        for (const key of getOfferProductKeys(offer)) {
            resolvedOffersByProductKey.current.set(key, offer);
        }
    }, []);

    const applySelectedOffer = useCallback((offer: IPurchasableOffer) => {
        if (!offer) return;

        setCurrentOffer(offer);

        if (offer.product && offer.product.productType === ProductTypeEnum.WALL) {
            setPurchaseOptions((prevValue) => {
                const newValue = { ...prevValue };

                newValue.extraData = offer.product.extraParam || null;

                return newValue;
            });
        }
    }, []);

    const loadCatalogPage = useCallback(
        (pageId: number, offerId: number) => {
            if (pageId < 0) return;

            pageRequestCorrelation.current.request(pageId, () => {
                setIsBusy(false);
                setCatalogLoadError('timeout');
            });
            setCatalogLoadError(null);
            setIsBusy(true);
            setPageId(pageId);

            if (pageId > -1) SendMessageComposer(new GetCatalogPageComposer(pageId, offerId, currentType));
        },
        [currentType]
    );

    const showCatalogPage = useCallback(
        (
            pageId: number,
            layoutCode: string,
            localization: IPageLocalization,
            offers: IPurchasableOffer[],
            offerId: number,
            acceptSeasonCurrencyAsCredits: boolean
        ) => {
            const catalogPage = new CatalogPage(pageId, layoutCode, localization, offers, acceptSeasonCurrencyAsCredits) as ICatalogPage;

            setCurrentPage(catalogPage);
            setPreviousPageId((prevValue) => (pageId !== -1 ? pageId : prevValue));
            setNavigationHidden(false);

            if (offerId > -1 && catalogPage.offers.length) {
                for (const offer of catalogPage.offers) {
                    if (offer.offerId !== offerId) continue;

                    setCurrentOffer(offer);

                    break;
                }
            }
        },
        []
    );

    const activateNode = useCallback(
        (targetNode: ICatalogNode, offerId: number = -1) => {
            cancelObjectMover();

            if (targetNode.parent.pageName === 'root') {
                if (targetNode.children.length) {
                    for (const child of targetNode.children) {
                        if (!child.isVisible) continue;

                        targetNode = child;

                        break;
                    }
                }
            }

            const nodes: ICatalogNode[] = [];

            let node = targetNode;

            while (node && node.pageName !== 'root') {
                nodes.push(node);

                node = node.parent;
            }

            nodes.reverse();

            setActiveNodes((prevValue) => {
                const isActive = prevValue.indexOf(targetNode) >= 0;
                const isOpen = targetNode.isOpen;

                for (const existing of prevValue) {
                    existing.deactivate();

                    if (nodes.indexOf(existing) === -1) existing.close();
                }

                for (const n of nodes) {
                    n.activate();

                    if (n.parent) n.open();

                    if (n === targetNode.parent && n.children.length) n.open();
                }

                if (isActive && isOpen) targetNode.close();
                else targetNode.open();

                return nodes;
            });

            if (targetNode.pageId > -1) loadCatalogPage(targetNode.pageId, offerId);
        },
        [setActiveNodes, loadCatalogPage, cancelObjectMover]
    );

    const openPageById = useCallback(
        (id: number) => {
            if (id !== -1) setSearchResult(null);

            if (!isVisible) {
                requestedPage.current.requestById = id;

                setIsVisible(true);
            } else {
                const node = getNodeById(id, rootNode);

                if (node) activateNode(node);
            }
        },
        [isVisible, rootNode, getNodeById, activateNode]
    );

    const openPageByName = useCallback(
        (name: string) => {
            setSearchResult(null);

            if (!isVisible) {
                requestedPage.current.requestByName = name;

                setIsVisible(true);
            } else {
                const node = getNodeByName(name, rootNode);

                if (node) activateNode(node);
            }
        },
        [isVisible, rootNode, getNodeByName, activateNode]
    );

    const openPageByOfferId = useCallback(
        (offerId: number) => {
            setSearchResult(null);

            if (!isVisible) {
                requestedPage.current.requestedByOfferId = offerId;

                setIsVisible(true);
            } else {
                const nodes = getNodesByOfferId(offerId);

                if (!nodes || !nodes.length) return;

                activateNode(nodes[0], offerId);
            }
        },
        [isVisible, getNodesByOfferId, activateNode]
    );

    const selectCatalogOffer = useCallback(
        (offer: IPurchasableOffer) => {
            if (!offer) return;

            applySelectedOffer(offer);

            if (offer.isLazy && offer.offerId > -1) offer.activate();
        },
        [applySelectedOffer]
    );

    const refreshBuilderStatus = useCallback(() => {}, []);

    useMessageEvent<CatalogPagesListEvent>(CatalogPagesListEvent, (event) => {
        const parser = event.getParser();
        const parserCatalogType = normalizeCatalogType(parser.catalogType);

        catalogIndexRequests.current.complete(parserCatalogType);

        if (parserCatalogType !== currentType) return;

        const { rootNode: builtRoot, offersToNodes: builtOffers } = buildCatalogNodeTree(parser.root);
        const activePageId = activeNodes[activeNodes.length - 1]?.pageId ?? -1;

        setRootNode(builtRoot);
        setOffersToNodes(builtOffers);
        if (activePageId > -1) setActiveNodes(restoreCatalogActivePath(builtRoot, activePageId));
    });

    useMessageEvent<CatalogPageMessageEvent>(CatalogPageMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.catalogType !== currentType) return;
        if (!pageRequestCorrelation.current.matches(parser.pageId)) return;

        const purchasableOffers: IPurchasableOffer[] = [];

        for (const offer of parser.offers) {
            const products: IProduct[] = [];
            const productData = GetProductDataForLocalization(offer.localizationId);

            for (const product of offer.products) {
                const furnitureData = GetFurnitureData(product.furniClassId, product.productType);

                products.push(
                    new Product(
                        product.productType,
                        product.furniClassId,
                        product.extraParam,
                        product.productCount,
                        productData,
                        furnitureData,
                        product.uniqueLimitedItem,
                        product.uniqueLimitedSeriesSize,
                        product.uniqueLimitedItemsLeft
                    )
                );
            }

            if (!products.length) continue;

            const purchasableOffer = new Offer(
                offer.offerId,
                offer.localizationId,
                offer.rent,
                offer.priceCredits,
                offer.priceActivityPoints,
                offer.priceActivityPointsType,
                offer.giftable,
                offer.clubLevel,
                products,
                offer.bundlePurchaseAllowed,
                offer.itemIds,
                offer.haveOffer
            );

            cacheResolvedOffer(purchasableOffer);

            if (
                currentType === CatalogType.NORMAL ||
                (purchasableOffer.pricingModel !== Offer.PRICING_MODEL_BUNDLE && purchasableOffer.pricingModel !== Offer.PRICING_MODEL_MULTI)
            )
                purchasableOffers.push(purchasableOffer);
        }

        const parsedCatalogPage = new CatalogPage(
            parser.pageId,
            parser.layoutCode,
            new PageLocalization(parser.localization.images.concat(), parser.localization.texts.concat()),
            purchasableOffers,
            parser.acceptSeasonCurrencyAsCredits
        );

        if (parser.frontPageItems && parser.frontPageItems.length) setFrontPageItems(parser.frontPageItems);

        if (pageRequestCorrelation.current.complete(parser.pageId)) {
            setIsBusy(false);
            showCatalogPage(
                parsedCatalogPage.pageId,
                parsedCatalogPage.layoutCode,
                parsedCatalogPage.localization,
                parsedCatalogPage.offers,
                parser.offerId,
                parsedCatalogPage.acceptSeasonCurrencyAsCredits
            );
        }
    });

    useMessageEvent<PurchaseOKMessageEvent>(PurchaseOKMessageEvent, (event) => {
        const parser = event.getParser();

        DispatchUiEvent(new CatalogPurchasedEvent(parser.offer));
    });

    useMessageEvent<PurchaseErrorMessageEvent>(PurchaseErrorMessageEvent, (event) => {
        const parser = event.getParser();

        DispatchUiEvent(new CatalogPurchaseFailureEvent(parser.code));
    });

    useMessageEvent<PurchaseNotAllowedMessageEvent>(PurchaseNotAllowedMessageEvent, (event) => {
        const parser = event.getParser();

        DispatchUiEvent(new CatalogPurchaseNotAllowedEvent(parser.code));
    });

    useMessageEvent<LimitedEditionSoldOutEvent>(LimitedEditionSoldOutEvent, (event) => {
        const parser = event.getParser();

        DispatchUiEvent(new CatalogPurchaseSoldOutEvent());
    });

    useMessageEvent<ProductOfferEvent>(ProductOfferEvent, (event) => {
        const parser = event.getParser();
        const offerData = parser.offer;

        if (!offerData || !offerData.products.length) return;

        const offerProductData = offerData.products[0];

        if (offerProductData.uniqueLimitedItem) {
            // update unique
        }

        const products: IProduct[] = [];
        const productData = GetProductDataForLocalization(offerData.localizationId);

        for (const product of offerData.products) {
            const furnitureData = GetFurnitureData(product.furniClassId, product.productType);

            products.push(
                new Product(
                    product.productType,
                    product.furniClassId,
                    product.extraParam,
                    product.productCount,
                    productData,
                    furnitureData,
                    product.uniqueLimitedItem,
                    product.uniqueLimitedSeriesSize,
                    product.uniqueLimitedItemsLeft
                )
            );
        }

        const offer = new Offer(
            offerData.offerId,
            offerData.localizationId,
            offerData.rent,
            offerData.priceCredits,
            offerData.priceActivityPoints,
            offerData.priceActivityPointsType,
            offerData.giftable,
            offerData.clubLevel,
            products,
            offerData.bundlePurchaseAllowed,
            offerData.itemIds,
            offerData.haveOffer
        );
        cacheResolvedOffer(offer);

        const matchingNodes = getNodesByOfferId(offer.offerId, true) || getNodesByOfferId(offer.offerId);

        if (!(currentType === CatalogType.NORMAL || (offer.pricingModel !== Offer.PRICING_MODEL_BUNDLE && offer.pricingModel !== Offer.PRICING_MODEL_MULTI)))
            return;

        if (matchingNodes?.length) {
            const referencePage = currentPage;

            offer.page = new CatalogPage(
                matchingNodes[0].pageId,
                referencePage?.layoutCode || 'default_3x3',
                referencePage?.localization || new PageLocalization([], []),
                [],
                referencePage?.acceptSeasonCurrencyAsCredits || false,
                referencePage?.mode ?? CatalogPage.MODE_NORMAL
            );
        } else {
            offer.page = currentPage;
        }

        applySelectedOffer(offer);
    });

    useMessageEvent<MarketplaceMakeOfferResult>(MarketplaceMakeOfferResult, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        let title = '';
        if (parser.result === 1) {
            title = LocalizeText('inventory.marketplace.result.title.success');
        } else {
            title = LocalizeText('inventory.marketplace.result.title.failure');
        }

        const message = LocalizeText(`inventory.marketplace.result.${parser.result}`);

        simpleAlert(message, NotificationAlertType.DEFAULT, null, null, title);
    });

    useMessageEvent<CatalogPublishedMessageEvent>(CatalogPublishedMessageEvent, (event) => {
        importedFurnidataMerged.current = false;
        catalogIndexRequests.current.reset();

        if (!connectionState.authenticated) return;

        catalogIndexRequests.current.request(currentType);

        if (isVisible && pageId > -1) loadCatalogPage(pageId, currentOffer?.offerId ?? -1);
    });

    useMessageEvent<BuildersClubFurniCountMessageEvent>(BuildersClubFurniCountMessageEvent, (event) => {
        const parser = event.getParser();

        setFurniCount(parser.furniCount);

        refreshBuilderStatus();
    });

    useMessageEvent<BuildersClubSubscriptionStatusMessageEvent>(BuildersClubSubscriptionStatusMessageEvent, (event) => {
        const parser = event.getParser();

        setFurniLimit(parser.furniLimit);
        setMaxFurniLimit(parser.maxFurniLimit);
        setSecondsLeft(parser.secondsLeft);
        setUpdateTime(GetTickerTime());
        setSecondsLeftWithGrace(parser.secondsLeftWithGrace);
        setBuilderPlacementBlockedByVisitors(parser.placementBlockedByVisitors);
        setBuilderPlacementAllowedInCurrentRoom(parser.placementAllowedInCurrentRoom);

        refreshBuilderStatus();
    });

    useUiEvent<CatalogPurchasedEvent>(CatalogPurchasedEvent.PURCHASE_SUCCESS, (event) => PlaySound(SoundNames.CREDITS));

    useOctaneEvent<RoomEngineObjectPlacedEvent>(RoomEngineObjectPlacedEvent.PLACED, (event) => {
        if (!objectMoverRequested || event.type !== RoomEngineObjectPlacedEvent.PLACED) return;

        resetPlacedOfferData(true);

        if (!purchasableOffer) {
            resetObjectMover();

            return;
        }

        let placed = false;

        const product = purchasableOffer.product;

        if (event.category === RoomObjectCategory.WALL) {
            switch (product.furnitureData.className) {
                case 'floor':
                case 'wallpaper':
                case 'landscape':
                    placed = event.placedOnFloor || event.placedOnWall;
                    break;
                default:
                    placed = event.placedInRoom;
                    break;
            }
        } else {
            placed = event.placedInRoom;
        }

        if (!placed) {
            resetObjectMover();

            return;
        }

        setPlacedObjectPurchaseData(
            new PlacedObjectPurchaseData(event.roomId, event.objectId, event.category, event.wallLocation, event.x, event.y, event.direction, purchasableOffer)
        );

        switch (currentType) {
            case CatalogType.NORMAL: {
                switch (event.category) {
                    case RoomObjectCategory.FLOOR:
                        GetRoomEngine().addFurnitureFloor(
                            event.roomId,
                            event.objectId,
                            product.productClassId,
                            new Vector3d(event.x, event.y, event.z),
                            new Vector3d(event.direction),
                            0,
                            new LegacyDataType()
                        );
                        break;
                    case RoomObjectCategory.WALL: {
                        switch (product.furnitureData.className) {
                            case 'floor':
                            case 'wallpaper':
                            case 'landscape':
                                resetRoomPaint(product.furnitureData.className, product.extraParam);
                                break;
                            default:
                                GetRoomEngine().addFurnitureWall(
                                    event.roomId,
                                    event.objectId,
                                    product.productClassId,
                                    new Vector3d(event.x, event.y, event.z),
                                    new Vector3d(event.direction * 45),
                                    0,
                                    event.instanceData,
                                    0
                                );
                                break;
                        }
                    }
                }

                const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

                if (roomObject) roomObject.model.setValue(RoomObjectVariable.FURNITURE_ALPHA_MULTIPLIER, 0.5);

                if (catalogSkipPurchaseConfirmation && !(purchasableOffer.product && purchasableOffer.product.isUniqueLimitedItem)) {
                    SendMessageComposer(new PurchaseFromCatalogComposer(pageId, purchasableOffer.offerId, product.extraParam, 1));

                    if (catalogPlaceMultipleObjects) requestOfferToMover(purchasableOffer);
                } else {
                    // confirm

                    if (catalogPlaceMultipleObjects) requestOfferToMover(purchasableOffer);
                }
                break;
            }
            case CatalogType.BUILDER: {
                const placeBuilderItem = () => {
                    let pageId = purchasableOffer.page.pageId;

                    if (pageId === DUMMY_PAGE_ID_FOR_OFFER_SEARCH) {
                        pageId = -1;
                    }

                    switch (event.category) {
                        case RoomObjectCategory.FLOOR:
                            SendMessageComposer(
                                new BuildersClubPlaceRoomItemMessageComposer(
                                    pageId,
                                    purchasableOffer.offerId,
                                    product.extraParam,
                                    event.x,
                                    event.y,
                                    event.direction
                                )
                            );
                            break;
                        case RoomObjectCategory.WALL:
                            SendMessageComposer(
                                new BuildersClubPlaceWallItemMessageComposer(pageId, purchasableOffer.offerId, product.extraParam, event.wallLocation)
                            );
                            break;
                    }

                    if (catalogPlaceMultipleObjects && furniCount + 1 < furniLimit) requestOfferToMover(purchasableOffer);
                };

                if (secondsLeft <= 0 && furniCount <= 0 && !builderTrialRoomHideConfirmed && showConfirm) {
                    showConfirm(
                        LocalizeText('room.confirm.hide_room'),
                        () => {
                            setBuilderTrialRoomHideConfirmed(true);
                            placeBuilderItem();
                        },
                        () => resetPlacedOfferData()
                    );
                } else {
                    placeBuilderItem();
                }
                break;
            }
        }
    });

    useUiEvent<InventoryFurniAddedEvent>(InventoryFurniAddedEvent.FURNI_ADDED, (event) => {
        const roomEngine = GetRoomEngine();

        if (
            !placedObjectPurchaseData ||
            placedObjectPurchaseData.productClassId !== event.spriteId ||
            placedObjectPurchaseData.roomId !== roomEngine.activeRoomId
        )
            return;

        switch (event.category) {
            case FurniCategory.FLOOR: {
                const floorType = roomEngine.getRoomInstanceVariable(roomEngine.activeRoomId, RoomObjectVariable.ROOM_FLOOR_TYPE);

                if (placedObjectPurchaseData.extraParam !== floorType) SendMessageComposer(new FurniturePlacePaintComposer(event.id));
                break;
            }
            case FurniCategory.WALL_PAPER: {
                const wallType = roomEngine.getRoomInstanceVariable(roomEngine.activeRoomId, RoomObjectVariable.ROOM_WALL_TYPE);

                if (placedObjectPurchaseData.extraParam !== wallType) SendMessageComposer(new FurniturePlacePaintComposer(event.id));
                break;
            }
            case FurniCategory.LANDSCAPE: {
                const landscapeType = roomEngine.getRoomInstanceVariable(roomEngine.activeRoomId, RoomObjectVariable.ROOM_LANDSCAPE_TYPE);

                if (placedObjectPurchaseData.extraParam !== landscapeType) SendMessageComposer(new FurniturePlacePaintComposer(event.id));
                break;
            }
            default:
                SendMessageComposer(
                    new FurniturePlaceComposer(
                        event.id,
                        placedObjectPurchaseData.category,
                        placedObjectPurchaseData.wallLocation,
                        placedObjectPurchaseData.x,
                        placedObjectPurchaseData.y,
                        placedObjectPurchaseData.direction
                    )
                );
        }

        if (!catalogPlaceMultipleObjects) resetPlacedOfferData();
    });

    useEffect(() => {
        return () => setCurrentOffer(null);
    }, [currentPage]);

    useEffect(() => {
        if (!isVisible || !rootNode || !offersToNodes || !requestedPage.current) return;

        switch (requestedPage.current.requestType) {
            case RequestedPage.REQUEST_TYPE_NONE:
                if (currentPage) return;

                if (rootNode.isBranch) {
                    for (const child of rootNode.children) {
                        if (child && child.isVisible) {
                            activateNode(child);

                            return;
                        }
                    }
                }
                return;
            case RequestedPage.REQUEST_TYPE_ID:
                openPageById(requestedPage.current.requestById);
                requestedPage.current.resetRequest();
                return;
            case RequestedPage.REQUEST_TYPE_OFFER:
                openPageByOfferId(requestedPage.current.requestedByOfferId);
                requestedPage.current.resetRequest();
                return;
            case RequestedPage.REQUEST_TYPE_NAME:
                openPageByName(requestedPage.current.requestByName);
                requestedPage.current.resetRequest();
                return;
        }
    }, [isVisible, rootNode, offersToNodes, currentPage, activateNode, openPageById, openPageByOfferId, openPageByName]);

    useEffect(() => {
        if (!searchResult && currentPage && currentPage.pageId === -1) openPageById(previousPageId);
    }, [searchResult, currentPage, previousPageId, openPageById]);

    useEffect(() => {
        if (isVisible) return;

        pageRequestCorrelation.current.reset();
        setIsBusy(false);
        setCatalogLoadError(null);
    }, [isVisible]);

    useEffect(() => {
        const refreshCatalogLocalization = () => {
            setCatalogLocalizationVersion((value) => value + 1);
            setCurrentOffer((prevValue) => (prevValue?.clone ? prevValue.clone() : prevValue));
            setCurrentPage((prevValue) => {
                if (!prevValue) return prevValue;

                const offers = prevValue.offers?.map((offer) => (offer?.clone ? offer.clone() : offer)) || [];

                return new CatalogPage(
                    prevValue.pageId,
                    prevValue.layoutCode,
                    prevValue.localization,
                    offers,
                    prevValue.acceptSeasonCurrencyAsCredits,
                    prevValue.mode
                );
            });
        };

        window.addEventListener('octane-localization-updated', refreshCatalogLocalization);

        return () => window.removeEventListener('octane-localization-updated', refreshCatalogLocalization);
    }, []);

    useEffect(() => {
        const refreshCurrentPage = () => {
            if (pageId > -1) loadCatalogPage(pageId, currentOffer?.offerId ?? -1);
        };

        const refreshCatalogIndex = () => {
            catalogIndexRequests.current.request(currentType);
        };

        window.addEventListener('catalog-admin-refresh-current-page', refreshCurrentPage);
        window.addEventListener('catalog-admin-refresh-index', refreshCatalogIndex);

        return () => {
            window.removeEventListener('catalog-admin-refresh-current-page', refreshCurrentPage);
            window.removeEventListener('catalog-admin-refresh-index', refreshCatalogIndex);
        };
    }, [pageId, currentOffer, loadCatalogPage, currentType]);

    useEffect(() => {
        if (!currentOffer) return;

        setPurchaseOptions({ quantity: 1, extraData: null, extraParamRequired: false, previewStuffData: null });
    }, [currentOffer]);

    useEffect(() => {
        if (secondsLeft > 0) setBuilderTrialRoomHideConfirmed(false);
    }, [secondsLeft]);

    useEffect(() => {
        if (!connectionState.authenticated) catalogIndexRequests.current.reset();

        catalogIndexPrewarm.current.update({
            authenticated: connectionState.authenticated,
            visible: isVisible,
            hasIndex: !!rootNode,
            catalogType: currentType
        });
    }, [connectionState.authenticated, isVisible, rootNode, currentType]);

    useEffect(() => {
        if (!isVisible) return;

        SendMessageComposer(new BuildersClubQueryFurniCountMessageComposer());
    }, [isVisible, currentType]);

    useEffect(() => {
        setRoomPreviewer(new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER));

        return () => {
            setRoomPreviewer((prevValue) => {
                prevValue.dispose();

                return null;
            });
        };
    }, []);

    const retryCurrentPage = useCallback(() => {
        if (pageId < 0) return;

        loadCatalogPage(pageId, currentOffer?.offerId ?? -1);
    }, [currentOffer, loadCatalogPage, pageId]);

    return {
        isVisible,
        setIsVisible,
        isBusy,
        catalogLoadError,
        pageId,
        previousPageId,
        currentType,
        rootNode,
        offersToNodes,
        currentPage,
        setCurrentPage,
        currentOffer,
        setCurrentOffer,
        activeNodes,
        searchResult,
        setSearchResult,
        frontPageItems,
        roomPreviewer,
        navigationHidden,
        setNavigationHidden,
        purchaseOptions,
        setPurchaseOptions,
        giftReceiver,
        setGiftReceiver,
        catalogLocalizationVersion,
        getNodeById,
        getNodeByName,
        getNodesByOfferId,
        activateNode,
        openPageById,
        openPageByName,
        openPageByOfferId,
        requestOfferToMover,
        openCatalogByType,
        toggleCatalogByType,
        furniCount,
        furniLimit,
        maxFurniLimit,
        secondsLeft,
        secondsLeftWithGrace,
        updateTime,
        catalogPlaceMultipleObjects,
        setCatalogPlaceMultipleObjects,
        getBuilderFurniPlaceableStatus,
        selectCatalogOffer,
        resetPlacedOfferData,
        retryCurrentPage
    };
};

/**
 * Read-only slice of server-driven catalog state. Anything a consumer
 * needs to *display* (page tree, current page, offers, Builders Club
 * counters) lives here.
 *
 * `roomPreviewer` and the busy flag are kept here too because they
 * are observed (not mutated) by every consumer that renders a preview.
 */
export const useCatalogData = () => {
    const {
        isBusy,
        catalogLoadError,
        rootNode,
        offersToNodes,
        currentPage,
        currentOffer,
        frontPageItems,
        searchResult,
        roomPreviewer,
        catalogLocalizationVersion,
        furniCount,
        furniLimit,
        maxFurniLimit,
        secondsLeft,
        secondsLeftWithGrace,
        updateTime
    } = useSharedHook(useCatalogStore);

    return {
        isBusy,
        catalogLoadError,
        rootNode,
        offersToNodes,
        currentPage,
        currentOffer,
        frontPageItems,
        searchResult,
        roomPreviewer,
        catalogLocalizationVersion,
        furniCount,
        furniLimit,
        maxFurniLimit,
        secondsLeft,
        secondsLeftWithGrace,
        updateTime
    };
};

/**
 * UI-side state owned by the catalog overlay itself: visibility, the
 * currently-rendered page id and breadcrumb, search query result,
 * purchase options, multi-place toggle. Includes the setters that
 * mutate the data slice when the user picks a page / offer / search
 * result — those don't trigger server traffic so they belong to the
 * UI layer.
 */
export const useCatalogUiState = () => {
    const {
        isVisible,
        setIsVisible,
        pageId,
        previousPageId,
        currentType,
        activeNodes,
        navigationHidden,
        setNavigationHidden,
        purchaseOptions,
        setPurchaseOptions,
        giftReceiver,
        setGiftReceiver,
        catalogPlaceMultipleObjects,
        setCatalogPlaceMultipleObjects,
        setCurrentPage,
        setCurrentOffer,
        setSearchResult
    } = useSharedHook(useCatalogStore);

    return {
        isVisible,
        setIsVisible,
        pageId,
        previousPageId,
        currentType,
        activeNodes,
        navigationHidden,
        setNavigationHidden,
        purchaseOptions,
        setPurchaseOptions,
        giftReceiver,
        setGiftReceiver,
        catalogPlaceMultipleObjects,
        setCatalogPlaceMultipleObjects,
        setCurrentPage,
        setCurrentOffer,
        setSearchResult
    };
};

/**
 * Imperative actions: open / toggle the catalog, navigate the page
 * tree, request a furni to the mover, look up nodes by id/name, run
 * the Builders Club placement check. These all either send a
 * composer to the server, dispatch a UI event, or run synchronous
 * tree queries — none of them are React state by themselves.
 */
export const useCatalogActions = () => {
    const {
        openCatalogByType,
        toggleCatalogByType,
        activateNode,
        openPageById,
        openPageByName,
        openPageByOfferId,
        requestOfferToMover,
        selectCatalogOffer,
        getNodeById,
        getNodeByName,
        getNodesByOfferId,
        getBuilderFurniPlaceableStatus,
        resetPlacedOfferData,
        retryCurrentPage
    } = useSharedHook(useCatalogStore);

    return {
        openCatalogByType,
        toggleCatalogByType,
        activateNode,
        openPageById,
        openPageByName,
        openPageByOfferId,
        requestOfferToMover,
        selectCatalogOffer,
        getNodeById,
        getNodeByName,
        getNodesByOfferId,
        getBuilderFurniPlaceableStatus,
        resetPlacedOfferData,
        retryCurrentPage
    };
};

registerSharedHook(useCatalogStore);
