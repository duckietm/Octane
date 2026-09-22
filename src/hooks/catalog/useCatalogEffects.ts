import {
    BuildersClubFurniCountMessageEvent,
    BuildersClubPlaceRoomItemMessageComposer,
    BuildersClubPlaceWallItemMessageComposer,
    BuildersClubQueryFurniCountMessageComposer,
    BuildersClubSubscriptionStatusMessageEvent,
    CatalogPublishedMessageEvent,
    FurniturePlaceComposer,
    FurniturePlacePaintComposer,
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
    RoomObjectVariable,
    RoomPreviewer,
    Vector3d
} from '@octane/renderer';
import { useQueryClient } from '@tanstack/react-query';
import { FC, useEffect, useRef } from 'react';
import {
    CatalogPage,
    CatalogType,
    DispatchUiEvent,
    FurniCategory,
    ICatalogNode,
    LocalizeText,
    NotificationAlertType,
    PageLocalization,
    PlacedObjectPurchaseData,
    PlaySound,
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
import { DUMMY_PAGE_ID_FOR_OFFER_SEARCH, useCatalogStore } from './catalogStore';
import { getNodesByOfferIdFromMap, restoreCatalogActivePath, RoomObjectCategory } from './useCatalog.helpers';
import { useCatalogPlaceMultipleItems } from './useCatalogPlaceMultipleItems';
import {
    bindCatalogQueryClient,
    buildPurchasableOffer,
    cloneCachedCatalogPages,
    dropCatalogCache,
    invalidateCatalogIndex,
    invalidateCatalogPage,
    invalidateCatalogPages,
    prefetchCatalogIndex,
    readCatalogIndex,
    useCatalogIndexQuery,
    useCatalogPageQuery,
    isOfferAllowedInCatalogType
} from './useCatalogQueries';
import { useCatalogSkipPurchaseConfirmation } from './useCatalogSkipPurchaseConfirmation';

const scheduleWhenIdle = (run: () => void): void => {
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback;

    if (typeof idle === 'function') idle(run, { timeout: 5000 });
    else setTimeout(run, 1000);
};

const refreshImportedFurnidata = (mergedRef: { current: boolean }, force: boolean = false) => {
    if (!force && mergedRef.current) return;

    try {
        const base = GetConfiguration().getValue<string>('furnidata.url');

        if (!base || !base.length) return;

        const importedUrl = base.replace(/\/+$/, '') + '/custom/imported.jsonc';

        GetSessionDataManager()
            .mergeFurnitureDataFromUrl(importedUrl)
            .then((added) => {
                mergedRef.current = true;

                if (added && added.length) GetRoomContentLoader().processFurnitureData(added);
            })
            .catch(() => {});
    } catch {}
};

export const useCatalogEffects = (): void => {
    const queryClient = useQueryClient();
    const connectionState = useConnectionState();
    const { simpleAlert = null, showConfirm = null } = useNotification();
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const [catalogPlaceMultipleObjects, setCatalogPlaceMultipleObjectsPreference] = useCatalogPlaceMultipleItems();
    const importedFurnidataMerged = useRef(false);
    const wasAuthenticated = useRef(connectionState.authenticated);

    const isVisible = useCatalogStore((state) => state.isVisible);
    const currentType = useCatalogStore((state) => state.currentType);
    const pageId = useCatalogStore((state) => state.pageId);
    const pendingRequest = useCatalogStore((state) => state.pendingRequest);
    const pendingOfferId = useCatalogStore((state) => state.pendingOfferId);

    const indexQuery = useCatalogIndexQuery(currentType, isVisible);
    const pageQuery = useCatalogPageQuery(currentType, pageId, isVisible);

    // Bound in the render phase, not only in the effect below: store actions
    // invoked by child effects that commit in the same pass (e.g. a sibling
    // effect calling activateNode) must find the client before this hook's
    // own effect has had a chance to run. Idempotent - just replaces the
    // module-level reference, safe to call every render.
    bindCatalogQueryClient(queryClient);

    useEffect(() => {
        bindCatalogQueryClient(queryClient);

        return () => bindCatalogQueryClient(null);
    }, [queryClient]);

    useEffect(() => {
        useCatalogStore.getState().setRoomPreviewer(new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER));

        return () => {
            const previewer = useCatalogStore.getState().roomPreviewer;

            previewer?.dispose();
            useCatalogStore.getState().setRoomPreviewer(null);
        };
    }, []);

    useEffect(() => {
        useCatalogStore.getState().setCatalogPlaceMultipleObjects(catalogPlaceMultipleObjects);
    }, [catalogPlaceMultipleObjects]);

    useEffect(
        () =>
            useCatalogStore.subscribe((state, previous) => {
                if (state.catalogPlaceMultipleObjects !== previous.catalogPlaceMultipleObjects) setCatalogPlaceMultipleObjectsPreference(state.catalogPlaceMultipleObjects);
            }),
        [setCatalogPlaceMultipleObjectsPreference]
    );

    // Index prefetch on login, and cache drop on logout.
    //
    // Deviation from the brief: this is a transition, not a level check. The
    // brief's version calls dropCatalogCache() whenever authenticated is
    // false, including on first mount - which would wipe a cache seeded
    // before mount (as this file's own tests do) and any login prefetch
    // whenever the host mounts after authentication already happened.
    // Tracking the previous value lets drop fire only on true -> false, and
    // the idle prefetch fire whenever authenticated is true, mount included.
    useEffect(() => {
        const was = wasAuthenticated.current;

        wasAuthenticated.current = connectionState.authenticated;

        if (connectionState.authenticated) {
            scheduleWhenIdle(() => prefetchCatalogIndex(useCatalogStore.getState().currentType));

            return;
        }

        if (was) dropCatalogCache();
    }, [connectionState.authenticated]);

    // Opening the catalog: imported furnidata and the Builders Club counters.
    useEffect(() => {
        if (!isVisible) return;

        refreshImportedFurnidata(importedFurnidataMerged);
        SendMessageComposer(new BuildersClubQueryFurniCountMessageComposer());
    }, [isVisible, currentType]);

    // Pending deep link and default first page, once the index is in cache.
    useEffect(() => {
        if (!indexQuery.data) return;

        useCatalogStore.getState().resolvePendingRequest();
    }, [indexQuery.data, isVisible, pendingRequest]);

    // Pending request stored while the index was missing: the query above is
    // enabled only while visible, and the store sets isVisible when it stores
    // the request, so the fetch starts on its own.

    // Page data arrival: front page items and the deep-linked offer.
    useEffect(() => {
        const data = pageQuery.data;

        if (!data || pageQuery.isPlaceholderData) return;

        if (data.frontPageItems.length) useCatalogStore.getState().setFrontPageItems(data.frontPageItems);

        useCatalogStore.getState().consumePendingOffer(data.page);
    }, [pageQuery.data, pageQuery.isPlaceholderData, pendingOfferId]);

    // Index refetched (publish, admin): keep the active path on the new tree.
    useEffect(() => {
        const data = indexQuery.data;

        if (!data) return;

        const { activeNodes, pageId: activePageId } = useCatalogStore.getState();

        if (activePageId > -1 && (!activeNodes.length || activeNodes.at(-1).pageId !== activePageId || !isNodeInTree(activeNodes.at(-1) ?? null, data.rootNode))) {
            useCatalogStore.setState({ activeNodes: restoreCatalogActivePath(data.rootNode, activePageId) });
        }
    }, [indexQuery.data]);

    useEffect(() => {
        const refresh = () => {
            useCatalogStore.getState().bumpLocalizationVersion();
            cloneCachedCatalogPages();
        };

        window.addEventListener('octane-localization-updated', refresh);

        return () => window.removeEventListener('octane-localization-updated', refresh);
    }, []);

    useMessageEvent<PurchaseOKMessageEvent>(PurchaseOKMessageEvent, (event) => {
        const { currentType: type, pageId: activePageId } = useCatalogStore.getState();

        DispatchUiEvent(new CatalogPurchasedEvent(event.getParser().offer));

        if (activePageId > -1) invalidateCatalogPage(type, activePageId);
    });

    useMessageEvent<PurchaseErrorMessageEvent>(PurchaseErrorMessageEvent, (event) => {
        DispatchUiEvent(new CatalogPurchaseFailureEvent(event.getParser().code));
    });

    useMessageEvent<PurchaseNotAllowedMessageEvent>(PurchaseNotAllowedMessageEvent, (event) => {
        DispatchUiEvent(new CatalogPurchaseNotAllowedEvent(event.getParser().code));
    });

    useMessageEvent<LimitedEditionSoldOutEvent>(LimitedEditionSoldOutEvent, () => {
        const { currentType: type, pageId: activePageId } = useCatalogStore.getState();

        DispatchUiEvent(new CatalogPurchaseSoldOutEvent());

        if (activePageId > -1) invalidateCatalogPage(type, activePageId);
    });

    useMessageEvent<ProductOfferEvent>(ProductOfferEvent, (event) => {
        const offerData = event.getParser().offer;

        if (!offerData || !offerData.products.length) return;

        const offer = buildPurchasableOffer(offerData);

        if (!offer) return;

        const state = useCatalogStore.getState();

        if (!isOfferAllowedInCatalogType(offer, state.currentType)) return;

        const index = readCatalogIndex(state.currentType);
        const matchingNodes = getNodesByOfferIdFromMap(offer.offerId, index?.offersToNodes, true) || getNodesByOfferIdFromMap(offer.offerId, index?.offersToNodes);
        const referencePage = state.pageOverride ?? pageQuery.data?.page ?? null;

        if (matchingNodes?.length) {
            offer.page = new CatalogPage(
                matchingNodes[0].pageId,
                referencePage?.layoutCode || 'default_3x3',
                referencePage?.localization || new PageLocalization([], []),
                [],
                referencePage?.acceptSeasonCurrencyAsCredits || false,
                referencePage?.mode ?? CatalogPage.MODE_NORMAL
            );
        } else {
            offer.page = referencePage;
        }

        state.selectCatalogOffer(offer);
    });

    useMessageEvent<MarketplaceMakeOfferResult>(MarketplaceMakeOfferResult, (event) => {
        const parser = event.getParser();

        if (!parser || !simpleAlert) return;

        const title = LocalizeText(parser.result === 1 ? 'inventory.marketplace.result.title.success' : 'inventory.marketplace.result.title.failure');

        simpleAlert(LocalizeText(`inventory.marketplace.result.${parser.result}`), NotificationAlertType.DEFAULT, null, null, title);
    });

    useMessageEvent<CatalogPublishedMessageEvent>(CatalogPublishedMessageEvent, () => {
        importedFurnidataMerged.current = false;

        if (!connectionState.authenticated) return;

        invalidateCatalogIndex(useCatalogStore.getState().currentType);
        invalidateCatalogPages();
    });

    useMessageEvent<BuildersClubFurniCountMessageEvent>(BuildersClubFurniCountMessageEvent, (event) => {
        useCatalogStore.getState().setBuildersClubFurniCount(event.getParser().furniCount);
    });

    useMessageEvent<BuildersClubSubscriptionStatusMessageEvent>(BuildersClubSubscriptionStatusMessageEvent, (event) => {
        const parser = event.getParser();

        useCatalogStore.getState().setBuildersClubSubscription({
            furniLimit: parser.furniLimit,
            maxFurniLimit: parser.maxFurniLimit,
            secondsLeft: parser.secondsLeft,
            updateTime: GetTickerTime(),
            secondsLeftWithGrace: parser.secondsLeftWithGrace,
            placementBlockedByVisitors: parser.placementBlockedByVisitors,
            placementAllowedInCurrentRoom: parser.placementAllowedInCurrentRoom
        });
    });

    useUiEvent<CatalogPurchasedEvent>(CatalogPurchasedEvent.PURCHASE_SUCCESS, () => PlaySound(SoundNames.CREDITS));

    useOctaneEvent<RoomEngineObjectPlacedEvent>(RoomEngineObjectPlacedEvent.PLACED, (event) => {
        const state = useCatalogStore.getState();

        if (!state.objectMoverRequested || event.type !== RoomEngineObjectPlacedEvent.PLACED) return;

        state.resetPlacedOfferData(true);

        const purchasableOffer = state.purchasableOffer;

        if (!purchasableOffer) {
            state.resetObjectMover();

            return;
        }

        const product = purchasableOffer.product;
        let placed = false;

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
            state.resetObjectMover();

            return;
        }

        state.setPlacedObjectPurchaseData(
            new PlacedObjectPurchaseData(event.roomId, event.objectId, event.category, event.wallLocation, event.x, event.y, event.direction, purchasableOffer)
        );

        switch (state.currentType) {
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
                                state.resetRoomPaint(product.furnitureData.className, product.extraParam);
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

                if (catalogSkipPurchaseConfirmation && !(product && product.isUniqueLimitedItem)) {
                    SendMessageComposer(new PurchaseFromCatalogComposer(state.pageId, purchasableOffer.offerId, product.extraParam, 1));
                }

                if (state.catalogPlaceMultipleObjects) state.requestOfferToMover(purchasableOffer);
                break;
            }
            case CatalogType.BUILDER: {
                const placeBuilderItem = () => {
                    let builderPageId = purchasableOffer.page.pageId;

                    if (builderPageId === DUMMY_PAGE_ID_FOR_OFFER_SEARCH) builderPageId = -1;

                    switch (event.category) {
                        case RoomObjectCategory.FLOOR:
                            SendMessageComposer(
                                new BuildersClubPlaceRoomItemMessageComposer(builderPageId, purchasableOffer.offerId, product.extraParam, event.x, event.y, event.direction)
                            );
                            break;
                        case RoomObjectCategory.WALL:
                            SendMessageComposer(new BuildersClubPlaceWallItemMessageComposer(builderPageId, purchasableOffer.offerId, product.extraParam, event.wallLocation));
                            break;
                    }

                    const latest = useCatalogStore.getState();

                    if (latest.catalogPlaceMultipleObjects && latest.furniCount + 1 < latest.furniLimit) latest.requestOfferToMover(purchasableOffer);
                };

                if (state.secondsLeft <= 0 && state.furniCount <= 0 && !state.builderTrialRoomHideConfirmed && showConfirm) {
                    showConfirm(
                        LocalizeText('room.confirm.hide_room'),
                        () => {
                            useCatalogStore.getState().setBuilderTrialRoomHideConfirmed(true);
                            placeBuilderItem();
                        },
                        () => useCatalogStore.getState().resetPlacedOfferData()
                    );
                } else {
                    placeBuilderItem();
                }
                break;
            }
        }
    });

    useUiEvent<InventoryFurniAddedEvent>(InventoryFurniAddedEvent.FURNI_ADDED, (event) => {
        const state = useCatalogStore.getState();
        const placedObjectPurchaseData = state.placedObjectPurchaseData;
        const roomEngine = GetRoomEngine();

        if (!placedObjectPurchaseData || placedObjectPurchaseData.productClassId !== event.spriteId || placedObjectPurchaseData.roomId !== roomEngine.activeRoomId) return;

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

        if (!state.catalogPlaceMultipleObjects) state.resetPlacedOfferData();
    });
};

const isNodeInTree = (node: ICatalogNode | null, root: ICatalogNode): boolean => {
    let current: ICatalogNode | null = node;

    while (current) {
        if (current === root) return true;

        current = current.parent;
    }

    return false;
};

export const CatalogEffectsHost: FC = () => {
    useCatalogEffects();

    return null;
};
