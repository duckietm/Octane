import { CreateLinkEvent, LtdRaffleEnteredMessageEvent, LtdRaffleResultMessageEvent, NotEnoughBalanceMessageEvent, PurchaseFromCatalogComposer } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    BuilderFurniPlaceableStatus,
    CatalogPurchaseState,
    CatalogType,
    DispatchUiEvent,
    GetClubMemberLevel,
    GetConfigurationValue,
    LocalizeText,
    NotificationBubbleType,
    Offer,
    OpenUrl,
    ProductTypeEnum,
    SendMessageComposer
} from '../../../../../api';
import { getCatalogBundlePrice } from '../../../../../api/catalog/CatalogBundleDiscount';
import { useHabbiconCatalog } from '../../../../../api/habbicons';
import { localizeWithFallback } from '../../../../../api/utils/localizeWithFallback';
import { LayoutLoadingSpinnerView, Text } from '../../../../../common';
import {
    CatalogEvent,
    CatalogInitGiftEvent,
    CatalogPurchasedEvent,
    CatalogPurchaseFailureEvent,
    CatalogPurchaseNotAllowedEvent,
    CatalogPurchaseSoldOutEvent
} from '../../../../../events';
import {
    useCatalogActions,
    useCatalogBundleDiscountRuleset,
    useCatalogData,
    useCatalogSkipPurchaseConfirmation,
    useCatalogUiState,
    useMessageEvent,
    useNotification,
    usePurse,
    useUiEvent
} from '../../../../../hooks';
import { CatalogPurchaseConfirmView } from '../../CatalogPurchaseConfirmView';
import { CatalogClubUpgradeButton } from './CatalogClubUpgradeButton';
import { canPurchaseCatalogOffer } from './catalogPurchase.helpers';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

interface CatalogPurchaseWidgetViewProps {
    disabled?: boolean;
    noGiftOption?: boolean;
    purchaseCallback?: () => void;
}

/** AIR's builderWidget error strip per placeable status: the icon (icons_builder_error_*) and the message key. */
const BUILDER_ERRORS: Record<number, { icon: string; text: string }> = {
    [BuilderFurniPlaceableStatus.FURNI_LIMIT_REACHED]: { icon: 'furnilimit', text: 'builder.placement_widget.error.limit_reached' },
    [BuilderFurniPlaceableStatus.NOT_IN_ROOM]: { icon: 'notroom', text: 'builder.placement_widget.error.not_in_room' },
    [BuilderFurniPlaceableStatus.NOT_ROOM_OWNER]: { icon: 'room', text: 'builder.placement_widget.error.not_group_admin' },
    [BuilderFurniPlaceableStatus.GUILD_ROOM]: { icon: 'grouproom', text: 'builder.placement_widget.error.group_room' },
    [BuilderFurniPlaceableStatus.VISITORS_IN_ROOM]: { icon: 'userinroom', text: 'builder.placement_widget.error.visitors' },
    [BuilderFurniPlaceableStatus.NOT_GROUP_ADMIN]: { icon: 'room', text: 'builder.placement_widget.error.not_group_admin' }
};

export const CatalogPurchaseWidgetView: FC<CatalogPurchaseWidgetViewProps> = (props) => {
    const { disabled = false, noGiftOption = false, purchaseCallback = null } = props;
    const [builderPlaceableRefreshTick, setBuilderPlaceableRefreshTick] = useState(0);
    const habbicons = useHabbiconCatalog();
    const [purchaseWillBeGift, setPurchaseWillBeGift] = useState(false);
    const [purchaseState, setPurchaseState] = useState(CatalogPurchaseState.NONE);
    const purchasePendingRef = useRef(false);
    const ownsPurchaseOutcomeRef = useRef(false);
    const confirmationOpenRef = useRef(false);
    const purchaseGuardTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const { showConfirm = null, showSingleBubble = null, simpleAlert = null } = useNotification();
    // AIR PurchaseConfirmationDialog raffle_container: shown while the server holds this LTD purchase in a raffle.
    const [isRaffling, setIsRaffling] = useState(false);
    const rafflingRef = useRef(false);
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const { data: bundleDiscountRuleset = null } = useCatalogBundleDiscountRuleset();
    const { currentOffer = null, currentPage = null } = useCatalogData();
    const {
        currentType = CatalogType.NORMAL,
        giftReceiver = null,
        purchaseOptions = null,
        setPurchaseOptions = null,
        setCatalogPlaceMultipleObjects = null
    } = useCatalogUiState();
    const { requestOfferToMover = null, getBuilderFurniPlaceableStatus = null, getNodesByOfferId = null, resetPlacedOfferData = null } = useCatalogActions();
    const { getCurrencyAmount = null } = usePurse();

    const setRaffling = useCallback((value: boolean) => {
        rafflingRef.current = value;
        setIsRaffling(value);
    }, []);

    // AIR hideRaffle: a dialog closed while its raffle is still running says the purchase is not processed yet.
    const notifyRaffleOngoing = useCallback(() => {
        if (!rafflingRef.current) return;

        setRaffling(false);
        showSingleBubble?.(localizeWithFallback('notification.raffle.ongoing', 'This LTD purchase has not been processed yet!'), NotificationBubbleType.LTD);
    }, [setRaffling, showSingleBubble]);
    const notifyRaffleOngoingRef = useRef(notifyRaffleOngoing);

    useEffect(() => {
        notifyRaffleOngoingRef.current = notifyRaffleOngoing;
    }, [notifyRaffleOngoing]);

    const resetPurchaseGuard = useCallback(() => {
        purchasePendingRef.current = false;
        ownsPurchaseOutcomeRef.current = false;
        confirmationOpenRef.current = false;

        if (purchaseGuardTimeoutRef.current) clearTimeout(purchaseGuardTimeoutRef.current);

        purchaseGuardTimeoutRef.current = null;
    }, []);

    const alertNotEnoughCredits = useCallback(() => {
        const description = LocalizeText('catalog.alert.notenough.credits.description');
        const title = LocalizeText('catalog.alert.notenough.title');

        if (showConfirm) {
            const settle = () => resetPlacedOfferData?.();

            showConfirm(
                description,
                () => {
                    settle();

                    const shopUrl = GetConfigurationValue<string>('web.shop.relativeUrl', '');

                    if (shopUrl) OpenUrl(shopUrl);
                },
                settle,
                null,
                null,
                title
            );
        } else {
            simpleAlert?.(description, null, null, null, title);
        }
    }, [resetPlacedOfferData, showConfirm, simpleAlert]);

    const alertNotEnoughActivityPoints = useCallback(
        (activityPointType: number) => {
            const currencyLocalization = GetConfigurationValue<string>(
                `activitypoint.name.${activityPointType}`,
                activityPointType === 0 ? 'tooltip.duckets' : ''
            );

            if (currencyLocalization) {
                const currencyName = LocalizeText(currencyLocalization);
                const description = LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]);
                const title = LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName]);

                if (activityPointType === 0 && showConfirm) {
                    const settle = () => resetPlacedOfferData?.();

                    showConfirm(
                        description,
                        () => {
                            settle();

                            const ducketsUrl = GetConfigurationValue<string>('link.format.duckets', '');

                            if (ducketsUrl) OpenUrl(ducketsUrl);
                        },
                        settle,
                        null,
                        null,
                        title
                    );
                } else {
                    simpleAlert?.(description, null, null, null, title);
                }
            } else {
                simpleAlert?.(
                    LocalizeText('catalog.alert.notenough.activitypoints.description'),
                    null,
                    null,
                    null,
                    LocalizeText(`catalog.alert.notenough.activitypoints.title.${activityPointType}`)
                );
            }
        },
        [resetPlacedOfferData, showConfirm, simpleAlert]
    );

    const showInsufficientBalanceAlert = useCallback(() => {
        if (!currentOffer || !purchaseOptions || !getCurrencyAmount) return false;

        const quantity = purchaseOptions.quantity;
        const creditPrice = getCatalogBundlePrice(currentOffer.priceInCredits, quantity, currentOffer.bundlePurchaseAllowed, bundleDiscountRuleset).price;
        const activityPointPrice = getCatalogBundlePrice(
            currentOffer.priceInActivityPoints,
            quantity,
            currentOffer.bundlePurchaseAllowed,
            bundleDiscountRuleset
        ).price;

        if (creditPrice > getCurrencyAmount(-1)) {
            alertNotEnoughCredits();

            return true;
        }

        if (activityPointPrice > getCurrencyAmount(currentOffer.activityPointType)) {
            alertNotEnoughActivityPoints(currentOffer.activityPointType);

            return true;
        }

        return false;
    }, [alertNotEnoughActivityPoints, alertNotEnoughCredits, bundleDiscountRuleset, currentOffer, getCurrencyAmount, purchaseOptions]);

    const onCatalogEvent = useCallback(
        (event: CatalogEvent) => {
            if (!ownsPurchaseOutcomeRef.current) return;

            ownsPurchaseOutcomeRef.current = false;

            switch (event.type) {
                case CatalogPurchasedEvent.PURCHASE_SUCCESS:
                    // AIR onPurchaseOK -> ltdRaffleStarted: a won raffle closes the dialog without the ongoing note.
                    setRaffling(false);
                    resetPurchaseGuard();
                    setPurchaseWillBeGift(false);
                    setPurchaseState(CatalogPurchaseState.NONE);
                    return;
                case CatalogPurchaseFailureEvent.PURCHASE_FAILED:
                    resetPurchaseGuard();
                    setPurchaseWillBeGift(false);
                    setPurchaseState(CatalogPurchaseState.FAILED);
                    return;
                case CatalogPurchaseNotAllowedEvent.NOT_ALLOWED:
                    resetPurchaseGuard();
                    setPurchaseWillBeGift(false);
                    setPurchaseState(CatalogPurchaseState.FAILED);
                    return;
                case CatalogPurchaseSoldOutEvent.SOLD_OUT:
                    resetPurchaseGuard();
                    setPurchaseWillBeGift(false);
                    setPurchaseState(CatalogPurchaseState.SOLD_OUT);
                    return;
            }
        },
        [resetPurchaseGuard, setRaffling]
    );

    // AIR HabboCatalog event 933 -> PurchaseConfirmationDialog.ltdRaffleEnded: keep the dialog open with the
    // raffling line until the draw. The draw can outlast the purchase guard, so the guard stops here.
    useMessageEvent<LtdRaffleEnteredMessageEvent>(LtdRaffleEnteredMessageEvent, () => {
        if (!purchasePendingRef.current || !confirmationOpenRef.current) return;

        if (purchaseGuardTimeoutRef.current) clearTimeout(purchaseGuardTimeoutRef.current);

        purchaseGuardTimeoutRef.current = null;
        setRaffling(true);
    });

    // AIR event 2316: the draw is over, the dialog closes (the won / lost note comes from useNotification).
    useMessageEvent<LtdRaffleResultMessageEvent>(LtdRaffleResultMessageEvent, () => {
        if (!rafflingRef.current) return;

        setRaffling(false);
        resetPurchaseGuard();
        setPurchaseWillBeGift(false);
        setPurchaseState(CatalogPurchaseState.NONE);
    });

    // AIR NotEnoughBalanceMessageEvent: the server refused the purchase this widget sent because the balance changed
    // since the client checked it. The purchase ends and the player sees which currency is short.
    useMessageEvent<NotEnoughBalanceMessageEvent>(NotEnoughBalanceMessageEvent, (event) => {
        if (!purchasePendingRef.current || !ownsPurchaseOutcomeRef.current) return;

        const parser = event.getParser();

        resetPurchaseGuard();
        setPurchaseWillBeGift(false);
        setPurchaseState(CatalogPurchaseState.NONE);

        if (parser.notEnoughCredits) alertNotEnoughCredits();
        else if (parser.notEnoughActivityPoints) alertNotEnoughActivityPoints(parser.activityPointType);
    });

    useUiEvent(CatalogPurchasedEvent.PURCHASE_SUCCESS, onCatalogEvent);
    useUiEvent(CatalogPurchaseFailureEvent.PURCHASE_FAILED, onCatalogEvent);
    useUiEvent(CatalogPurchaseNotAllowedEvent.NOT_ALLOWED, onCatalogEvent);
    useUiEvent(CatalogPurchaseSoldOutEvent.SOLD_OUT, onCatalogEvent);

    const isLimitedSoldOut = useMemo(() => {
        if (!currentOffer) return false;

        if (purchaseOptions.extraParamRequired && (!purchaseOptions.extraData || !purchaseOptions.extraData.length)) return false;

        if (currentOffer.pricingModel === Offer.PRICING_MODEL_SINGLE) {
            const product = currentOffer.product;

            if (product && product.isUniqueLimitedItem) return !product.uniqueLimitedItemsLeft;
        }

        return false;
    }, [currentOffer, purchaseOptions]);

    const habbiconOwned =
        currentOffer?.product?.productType === ProductTypeEnum.HABBICON &&
        habbicons.entries.some((entry) => entry.id === currentOffer.product.productClassId && (entry.owned || entry.claimable));

    const purchase = (isGift: boolean = false) => {
        if (habbiconOwned || !canPurchaseCatalogOffer(currentOffer) || purchasePendingRef.current) return;

        if (GetClubMemberLevel() < currentOffer.clubLevel) {
            CreateLinkEvent('habboUI/open/hccenter');

            return;
        }

        let pageId = currentOffer.page.pageId;

        if (pageId === -1 && getNodesByOfferId) {
            const nodes = getNodesByOfferId(currentOffer.offerId);
            if (nodes && nodes.length) pageId = nodes[0].pageId;
        }

        if (isGift) {
            confirmationOpenRef.current = false;
            setPurchaseWillBeGift(false);
            setPurchaseState(CatalogPurchaseState.NONE);
            DispatchUiEvent(new CatalogInitGiftEvent(pageId, currentOffer.offerId, purchaseOptions.extraData, giftReceiver ?? ''));

            return;
        }

        if (showInsufficientBalanceAlert()) {
            confirmationOpenRef.current = false;
            setPurchaseState(CatalogPurchaseState.NONE);

            return;
        }

        purchasePendingRef.current = true;
        ownsPurchaseOutcomeRef.current = true;
        setPurchaseState(CatalogPurchaseState.PURCHASE);

        purchaseGuardTimeoutRef.current = setTimeout(() => {
            resetPurchaseGuard();
            setPurchaseWillBeGift(false);
            setPurchaseState(CatalogPurchaseState.NONE);
        }, 10000);

        if (purchaseCallback) {
            purchaseCallback();

            return;
        }

        SendMessageComposer(new PurchaseFromCatalogComposer(pageId, currentOffer.offerId, purchaseOptions.extraData, purchaseOptions.quantity));
    };

    useEffect(() => {
        if (!currentOffer) return;

        notifyRaffleOngoingRef.current();
        resetPurchaseGuard();
        ownsPurchaseOutcomeRef.current = false;
        setPurchaseWillBeGift(false);
        setPurchaseState(CatalogPurchaseState.NONE);
    }, [currentOffer, resetPurchaseGuard, setPurchaseOptions]);

    useEffect(() => resetPurchaseGuard, [resetPurchaseGuard]);

    // AIR dispose -> hideRaffle: closing the catalog while the raffle runs leaves the ongoing note behind.
    useEffect(() => () => notifyRaffleOngoingRef.current(), []);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> = null;

        if (purchaseState === CatalogPurchaseState.FAILED) {
            timeout = setTimeout(() => setPurchaseState(CatalogPurchaseState.NONE), 3000);
        }

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [purchaseState]);

    const isBuildersClubOffer = currentType === CatalogType.BUILDER;
    const isBuildersClubPlaceable =
        isBuildersClubOffer &&
        !!currentOffer &&
        !!currentOffer.product &&
        (currentOffer.product.productType === ProductTypeEnum.FLOOR || currentOffer.product.productType === ProductTypeEnum.WALL);
    const builderPlaceableStatus = useMemo(() => {
        if (!isBuildersClubPlaceable || !getBuilderFurniPlaceableStatus || !currentOffer) return BuilderFurniPlaceableStatus.OKAY;

        return getBuilderFurniPlaceableStatus(currentOffer);
    }, [currentOffer, getBuilderFurniPlaceableStatus, isBuildersClubPlaceable, builderPlaceableRefreshTick]);
    useEffect(() => {
        if (!isBuildersClubPlaceable) return;

        const interval = setInterval(() => setBuilderPlaceableRefreshTick((prevValue) => prevValue + 1), 500);

        return () => clearInterval(interval);
    }, [isBuildersClubPlaceable]);

    if (!currentOffer) return null;

    const isLimitedEditionOffer = !!(currentOffer.product && currentOffer.product.isUniqueLimitedItem);
    const isOfferUnavailable = !canPurchaseCatalogOffer(currentOffer);
    // A club-locked offer replaces the purchase buttons with the club invitation; either
    // button would only open the club centre for a player below the offer's club level.
    const isClubLocked = !isBuildersClubOffer && !isOfferUnavailable && !habbiconOwned && GetClubMemberLevel() < currentOffer.clubLevel;

    const PurchaseButton = () => {
        const standardButtonClassNames = ['octane-catalog-standard-button'];
        const purchaseButtonClassNames = [...standardButtonClassNames, 'octane-catalog-standard-buy-button'];

        if (habbiconOwned)
            return (
                <NativeTextTree>
                    <BaseButton type="button" className={purchaseButtonClassNames.join(' ')} disabled>
                        {localizeWithFallback('generic.owned', 'Owned')}
                    </BaseButton>
                </NativeTextTree>
            );

        if (isBuildersClubPlaceable) {
            const hasMissingExtraParam = purchaseOptions.extraParamRequired && (!purchaseOptions.extraData || !purchaseOptions.extraData.length);
            // AIR's BuilderCatalogWidget: any status but OKAY disables both buttons and, except a missing offer, shows the
            // error strip (icon + message) over the hint.
            const builderError = BUILDER_ERRORS[builderPlaceableStatus as number] ?? null;
            const isDisabled = hasMissingExtraParam || (builderPlaceableStatus as number) !== BuilderFurniPlaceableStatus.OKAY;
            const startBuilderPlacement = (placeMultiple: boolean) => {
                if (isDisabled) return;

                setCatalogPlaceMultipleObjects(placeMultiple);
                requestOfferToMover(currentOffer);
            };

            return (
                <NativeTextTree>
                    <div className="octane-builders-widget">
                        <span className="octane-builders-widget-hint">{LocalizeText('builder.placement_widget.hint')}</span>
                        {builderError && (
                            <div className="octane-builders-widget-error" data-error={builderError.icon} role="status">
                                <span aria-hidden="true" className="octane-builders-widget-error-icon" />
                                <span className="octane-builders-widget-error-message">{LocalizeText(builderError.text)}</span>
                            </div>
                        )}
                        <BaseButton
                            type="button"
                            className="octane-builders-place-button is-one"
                            disabled={isDisabled}
                            onClick={() => startBuilderPlacement(false)}
                        >
                            {LocalizeText('builder.placement_widget.place_one')}
                        </BaseButton>
                        <BaseButton
                            type="button"
                            className="octane-builders-place-button is-many"
                            disabled={isDisabled}
                            onClick={() => startBuilderPlacement(true)}
                        >
                            {LocalizeText('builder.placement_widget.place_many')}
                        </BaseButton>
                    </div>
                </NativeTextTree>
            );
        }

        if (isOfferUnavailable)
            return (
                <NativeTextTree>
                    <BaseButton type="button" className={purchaseButtonClassNames.join(' ')} disabled>
                        {currentOffer.isLazy ? LocalizeText('generic.loading') : LocalizeText('catalog.purchase_confirmation.' + (currentOffer.isRentOffer ? 'rent' : 'buy'))}
                    </BaseButton>
                </NativeTextTree>
            );

        if (isLimitedSoldOut)
            return (
                <NativeTextTree>
                    <BaseButton type="button" className={purchaseButtonClassNames.join(' ')} disabled>
                        {LocalizeText('catalog.alert.limited_edition_sold_out.title')}
                    </BaseButton>
                </NativeTextTree>
            );

        switch (purchaseState) {
            case CatalogPurchaseState.CONFIRM:
                return (
                    <NativeTextTree>
                        <BaseButton type="button" className={`${purchaseButtonClassNames.join(' ')} pointer-events-none`}>
                            {LocalizeText('catalog.purchase_confirmation.' + (currentOffer.isRentOffer ? 'rent' : 'buy'))}
                        </BaseButton>
                    </NativeTextTree>
                );
            case CatalogPurchaseState.PURCHASE:
                return (
                    <NativeTextTree>
                        <BaseButton type="button" className={purchaseButtonClassNames.join(' ')} disabled>
                            <LayoutLoadingSpinnerView />
                        </BaseButton>
                    </NativeTextTree>
                );
            case CatalogPurchaseState.FAILED:
                return (
                    <NativeTextTree>
                        <BaseButton type="button" className={purchaseButtonClassNames.join(' ')}>
                            {LocalizeText('generic.failed')}
                        </BaseButton>
                    </NativeTextTree>
                );
            case CatalogPurchaseState.SOLD_OUT:
                return (
                    <NativeTextTree>
                        <BaseButton type="button" className={purchaseButtonClassNames.join(' ')}>
                            {LocalizeText('generic.failed') + ' - ' + LocalizeText('catalog.alert.limited_edition_sold_out.title')}
                        </BaseButton>
                    </NativeTextTree>
                );
            case CatalogPurchaseState.NONE:
            default:
                return (
                    <NativeTextTree>
                        <BaseButton
                            type="button"
                            className={purchaseButtonClassNames.join(' ')}
                            disabled={disabled || (purchaseOptions.extraParamRequired && (!purchaseOptions.extraData || !purchaseOptions.extraData.length))}
                            onClick={() => {
                                if (catalogSkipPurchaseConfirmation && !isLimitedEditionOffer) {
                                    confirmationOpenRef.current = false;
                                    setPurchaseWillBeGift(false);
                                    purchase();

                                    return;
                                }

                                if (!showInsufficientBalanceAlert()) {
                                    confirmationOpenRef.current = true;
                                    setPurchaseWillBeGift(false);
                                    setPurchaseState(CatalogPurchaseState.CONFIRM);
                                }
                            }}
                        >
                            {LocalizeText('catalog.purchase_confirmation.' + (currentOffer.isRentOffer ? 'rent' : 'buy'))}
                        </BaseButton>
                    </NativeTextTree>
                );
        }
    };

    return (
        <NativeTextTree>
            <>
                {isClubLocked && <CatalogClubUpgradeButton />}
                {!isClubLocked && !isBuildersClubOffer && !noGiftOption && !currentOffer.isRentOffer && (
                    <BaseButton
                        type="button"
                        className="octane-catalog-standard-button octane-catalog-standard-gift-button"
                        disabled={
                            disabled ||
                            purchaseOptions.quantity > 1 ||
                            isOfferUnavailable ||
                            !currentOffer.giftable ||
                            currentOffer.product?.productType === ProductTypeEnum.HABBICON ||
                            isLimitedSoldOut ||
                            (purchaseOptions.extraParamRequired && (!purchaseOptions.extraData || !purchaseOptions.extraData.length))
                        }
                        onClick={() => {
                            if (showInsufficientBalanceAlert()) return;

                            confirmationOpenRef.current = true;
                            setPurchaseWillBeGift(true);
                            setPurchaseState(CatalogPurchaseState.CONFIRM);
                        }}
                    >
                        {LocalizeText('catalog.purchase_confirmation.gift')}
                    </BaseButton>
                )}
                {!isClubLocked && <PurchaseButton />}
                {confirmationOpenRef.current && (purchaseState === CatalogPurchaseState.CONFIRM || purchaseState === CatalogPurchaseState.PURCHASE) && (
                    <CatalogPurchaseConfirmView
                        isGift={purchaseWillBeGift}
                        isRaffling={isRaffling}
                        isSubmitting={purchaseState === CatalogPurchaseState.PURCHASE}
                        bundleDiscountRuleset={bundleDiscountRuleset}
                        offer={currentOffer}
                        quantity={purchaseOptions.quantity}
                        onCancel={() => {
                            // The raffle result still arrives later; this dialog just stops waiting for it.
                            if (rafflingRef.current) resetPurchaseGuard();

                            notifyRaffleOngoing();
                            confirmationOpenRef.current = false;
                            resetPlacedOfferData?.();
                            setPurchaseWillBeGift(false);
                            setPurchaseState(CatalogPurchaseState.NONE);
                        }}
                        onConfirm={() => purchase(purchaseWillBeGift)}
                    />
                )}
            </>
        </NativeTextTree>
    );
};
