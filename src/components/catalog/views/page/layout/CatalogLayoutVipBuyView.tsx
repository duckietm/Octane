import { ClubOfferData, CreateLinkEvent, PurchaseFromCatalogComposer } from '@octane/renderer';
import { FC, useCallback, useMemo, useRef, useState } from 'react';
import { CatalogPurchaseState, DispatchUiEvent, GetConfigurationValue, LocalizeText, OpenUrl, SanitizeHtml, SendMessageComposer } from '../../../../../api';
import vipIconMedium from '../../../../../assets/images/catalog/air/vip-icon-medium.png';
import { Button, LayoutCurrencyIcon, LayoutLoadingSpinnerView } from '../../../../../common';
import { CatalogEvent, CatalogInitGiftEvent, CatalogPurchasedEvent, CatalogPurchaseFailureEvent } from '../../../../../events';
import {
    useCatalogActions,
    useCatalogData,
    useCatalogSkipPurchaseConfirmation,
    useCatalogUiState,
    useClubOffers,
    useGiftConfiguration,
    useNotification,
    usePurse,
    useUiEvent
} from '../../../../../hooks';
import { CatalogClubPurchaseConfirmView } from './CatalogClubPurchaseConfirmView';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { getClubMembershipSummary, groupClubOffers } from './clubPurchase.helpers';

const CLUB_WINDOW_ID = 1;

export const CatalogLayoutVipBuyView: FC<CatalogLayoutProps> = ({ page = null }) => {
    const [pendingOffer, setPendingOffer] = useState<ClubOfferData | null>(null);
    const [purchaseWillBeGift, setPurchaseWillBeGift] = useState(false);
    const [purchaseState, setPurchaseState] = useState(CatalogPurchaseState.NONE);
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const { currentPage = null } = useCatalogData();
    const { resetPlacedOfferData = null } = useCatalogActions();
    const { giftReceiver = null } = useCatalogUiState();
    const { data: giftConfiguration = null } = useGiftConfiguration();
    const { purse = null, getCurrencyAmount = null } = usePurse();
    const { showConfirm = null, simpleAlert = null } = useNotification();
    const { data: offers = null } = useClubOffers(CLUB_WINDOW_ID);
    const isPurchasingRef = useRef(false);
    const pageData = currentPage ?? page;
    const layoutCode = pageData?.layoutCode ?? 'club_buy';
    const isVipPage = layoutCode === 'vip_buy';
    const offerGroups = useMemo(() => groupClubOffers(layoutCode, offers ?? []), [layoutCode, offers]);
    const membership = useMemo(() => getClubMembershipSummary(purse), [purse]);

    const onCatalogEvent = useCallback((event: CatalogEvent) => {
        if (!isPurchasingRef.current) return;

        switch (event.type) {
            case CatalogPurchasedEvent.PURCHASE_SUCCESS:
                isPurchasingRef.current = false;
                setPurchaseWillBeGift(false);
                setPurchaseState(CatalogPurchaseState.NONE);
                setPendingOffer(null);
                return;
            case CatalogPurchaseFailureEvent.PURCHASE_FAILED:
                isPurchasingRef.current = false;
                setPurchaseWillBeGift(false);
                setPurchaseState(CatalogPurchaseState.NONE);
                setPendingOffer(null);
                return;
        }
    }, []);

    useUiEvent(CatalogPurchasedEvent.PURCHASE_SUCCESS, onCatalogEvent);
    useUiEvent(CatalogPurchaseFailureEvent.PURCHASE_FAILED, onCatalogEvent);

    const getOfferText = useCallback(
        (offer: ClubOfferData) => {
            if (!isVipPage) return LocalizeText('catalog.club.item.header', ['months'], [offer.months.toString()]);

            if (offer.months > 0) {
                return LocalizeText('catalog.vip.item.header.months', ['num_months'], [offer.months.toString()]);
            }

            return LocalizeText('catalog.vip.item.header.days', ['num_days'], [offer.extraDays.toString()]);
        },
        [isVipPage]
    );

    const getPurchaseHeader = useCallback(
        (offer: ClubOfferData) => {
            const extensionOrSubscription = membership.tier === 'vip' ? 'extension.' : 'subscription.';
            const daysOrMonths = offer.months === 0 ? 'days' : 'months';
            const value = offer.months === 0 ? offer.extraDays : offer.months;

            return LocalizeText(`catalog.vip.buy.confirm.${extensionOrSubscription}${daysOrMonths}`, [`num_${daysOrMonths}`], [value.toString()]);
        },
        [membership.tier]
    );

    const getPurchaseValidUntil = useCallback((offer: ClubOfferData) => {
        return LocalizeText(
            'catalog.vip.buy.confirm.end_date',
            ['day', 'month', 'year'],
            [offer.day.toString(), offer.month.toString(), offer.year.toString()]
        );
    }, []);

    const getActivityPointName = useCallback((type: number) => {
        const fallbackLocalization = type === 0 ? 'tooltip.duckets' : type === 5 ? 'tooltip.diamonds' : '';
        const currencyLocalization = GetConfigurationValue<string>(`activitypoint.name.${type}`, fallbackLocalization);

        return currencyLocalization ? LocalizeText(currencyLocalization) : `#${type}`;
    }, []);

    const showInsufficientBalanceAlert = useCallback(
        (offer: ClubOfferData) => {
            if (!getCurrencyAmount) return false;

            if (offer.priceCredits > getCurrencyAmount(-1)) {
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

                return true;
            }

            if (offer.priceActivityPoints > getCurrencyAmount(offer.priceActivityPointsType)) {
                const currencyLocalization = GetConfigurationValue<string>(
                    `activitypoint.name.${offer.priceActivityPointsType}`,
                    offer.priceActivityPointsType === 0 ? 'tooltip.duckets' : ''
                );

                if (currencyLocalization) {
                    const currencyName = LocalizeText(currencyLocalization);
                    const description = LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]);
                    const title = LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName]);

                    if (offer.priceActivityPointsType === 0 && showConfirm) {
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
                        LocalizeText(`catalog.alert.notenough.activitypoints.title.${offer.priceActivityPointsType}`)
                    );
                }

                return true;
            }

            return false;
        },
        [getCurrencyAmount, resetPlacedOfferData, showConfirm, simpleAlert]
    );

    const submitPurchase = useCallback(
        (offer: ClubOfferData) => {
            if (!pageData || isPurchasingRef.current) return;

            if (showInsufficientBalanceAlert(offer)) {
                setPendingOffer(null);
                setPurchaseState(CatalogPurchaseState.NONE);

                return;
            }

            isPurchasingRef.current = true;
            setPurchaseWillBeGift(false);
            setPendingOffer(offer);
            setPurchaseState(CatalogPurchaseState.PURCHASE);
            SendMessageComposer(new PurchaseFromCatalogComposer(pageData.pageId, offer.offerId, null, 1));
        },
        [pageData, showInsufficientBalanceAlert]
    );

    const startPurchase = useCallback(
        (offer: ClubOfferData) => {
            if (isPurchasingRef.current) return;

            if (showInsufficientBalanceAlert(offer)) return;

            if (catalogSkipPurchaseConfirmation) {
                submitPurchase(offer);
                return;
            }

            setPurchaseWillBeGift(false);
            setPendingOffer(offer);
            setPurchaseState(CatalogPurchaseState.CONFIRM);
        },
        [catalogSkipPurchaseConfirmation, showInsufficientBalanceAlert, submitPurchase]
    );

    const startGift = useCallback(
        (offer: ClubOfferData) => {
            if (!pageData || isPurchasingRef.current || !offer.giftable) return;
            if (showInsufficientBalanceAlert(offer)) return;

            setPurchaseWillBeGift(true);
            setPendingOffer(offer);
            setPurchaseState(CatalogPurchaseState.CONFIRM);
        },
        [pageData, showInsufficientBalanceAlert]
    );

    const confirmPendingOffer = useCallback(() => {
        if (!pendingOffer) return;

        if (purchaseWillBeGift) {
            if (!pageData) return;

            DispatchUiEvent(new CatalogInitGiftEvent(pageData.pageId, pendingOffer.offerId, '', giftReceiver ?? ''));
            setPurchaseWillBeGift(false);
            setPendingOffer(null);
            setPurchaseState(CatalogPurchaseState.NONE);
            return;
        }

        submitPurchase(pendingOffer);
    }, [giftReceiver, pageData, pendingOffer, purchaseWillBeGift, submitPurchase]);

    const renderPrice = (offer: ClubOfferData) => {
        if (!isVipPage) {
            return (
                <span className="octane-club-offer-prices is-compact-text">
                    {offer.priceCredits > 0 && LocalizeText('catalog.club.price', ['price'], [offer.priceCredits.toString()])}
                    {offer.priceCredits > 0 && offer.priceActivityPoints > 0 && ' + '}
                    {offer.priceActivityPoints > 0 && `${offer.priceActivityPoints} ${getActivityPointName(offer.priceActivityPointsType)}`}
                </span>
            );
        }

        return (
            <span className="octane-club-offer-prices">
                {offer.priceCredits > 0 && (
                    <span className="octane-club-offer-price" data-currency-type="-1">
                        <span>{offer.priceCredits}</span>
                        <LayoutCurrencyIcon type={-1} />
                    </span>
                )}
                {offer.priceActivityPoints > 0 && (
                    <>
                        {offer.priceCredits > 0 && <span className="octane-club-price-separator">+</span>}
                        <span className="octane-club-offer-price" data-currency-type={offer.priceActivityPointsType}>
                            <span>{offer.priceActivityPoints}</span>
                            <LayoutCurrencyIcon type={offer.priceActivityPointsType} />
                        </span>
                    </>
                )}
            </span>
        );
    };

    const renderOffer = (offer: ClubOfferData) => {
        const isPending = pendingOffer?.offerId === offer.offerId;

        return (
            <article
                key={offer.offerId}
                className={`octane-club-offer ${isVipPage ? 'is-wide' : 'is-compact'} ${offer.vip ? 'is-vip' : 'is-hc'}`}
                data-offer-id={offer.offerId}
            >
                <header className="octane-club-offer-header">
                    {isVipPage ? (
                        <img alt="" aria-hidden="true" className="octane-club-vip-medium-mark" draggable={false} src={vipIconMedium} />
                    ) : (
                        <span aria-hidden="true" className={`octane-club-compact-mark ${offer.vip ? 'is-vip' : 'is-hc'}`} />
                    )}
                    <strong>{getOfferText(offer)}</strong>
                </header>
                <div className="octane-club-offer-footer">
                    {renderPrice(offer)}
                    <div className="octane-club-offer-actions">
                        {isVipPage && giftConfiguration?.isEnabled && offer.giftable && (
                            <Button classNames={['octane-club-offer-action']} disabled={isPurchasingRef.current} onClick={() => startGift(offer)}>
                                {LocalizeText('catalog.purchase_confirmation.gift')}
                            </Button>
                        )}
                        <Button classNames={['octane-club-offer-action', 'is-buy']} disabled={isPurchasingRef.current} onClick={() => startPurchase(offer)}>
                            {isPending && purchaseState === CatalogPurchaseState.PURCHASE ? (
                                <LayoutLoadingSpinnerView />
                            ) : (
                                LocalizeText('catalog.club.button.buy')
                            )}
                        </Button>
                    </div>
                </div>
            </article>
        );
    };

    const membershipHeaderKey = {
        hc: 'catalog.club.buy.header.hc',
        none: 'catalog.club.buy.header.none',
        vip: 'catalog.club.buy.header.vip'
    }[membership.tier];
    const membershipInfoKey = {
        hc: 'catalog.club.buy.info.hc',
        none: 'catalog.club.buy.info.none',
        vip: 'catalog.club.buy.info.vip'
    }[membership.tier];
    const remainingKey = membership.tier === 'vip' ? 'catalog.club.buy.remaining.vip' : 'catalog.club.buy.remaining.hc';
    const teaserImage = pageData?.localization.getImage(1) ?? '';
    const vipTitleKey = membership.tier === 'vip' ? 'catalog.vip.extend.title' : 'catalog.vip.buy.title';
    const vipInfo =
        membership.tier === 'vip' ? LocalizeText('catalog.vip.extend.info', ['days'], [membership.totalDays.toString()]) : LocalizeText('catalog.vip.buy.info');

    return (
        <div className={`octane-club-purchase-layout ${isVipPage ? 'is-vip-page' : 'is-club-page'}`}>
            {isVipPage ? (
                <>
                    <div className="octane-club-vip-intro">
                        {teaserImage ? <img alt="" className="octane-club-teaser" src={teaserImage} /> : <span className="octane-club-teaser" />}
                        <div className="octane-club-vip-copy">
                            <strong>{LocalizeText(vipTitleKey)}</strong>
                            <span>{vipInfo}</span>
                        </div>
                    </div>
                    <div className="octane-club-vip-offers">{offerGroups.vip.map(renderOffer)}</div>
                    <div
                        className="octane-club-center-link"
                        dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('catalog.vip.buy.hccenter')) }}
                        role="link"
                        tabIndex={0}
                        onClick={(event) => {
                            event.preventDefault();
                            CreateLinkEvent('habboUI/open/hccenter');
                        }}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;

                            event.preventDefault();
                            CreateLinkEvent('habboUI/open/hccenter');
                        }}
                    />
                </>
            ) : (
                <>
                    <header className="octane-club-membership-header">
                        <strong>{LocalizeText(membershipHeaderKey)}</strong>
                    </header>
                    <p className="octane-club-membership-info">{LocalizeText(membershipInfoKey)}</p>
                    <div className="octane-club-emblem" aria-hidden="true">
                        <span className="octane-club-vip-emblem" />
                    </div>
                    <div className="octane-club-columns">
                        <section className="octane-club-hc-column">
                            {offerGroups.hc.map(renderOffer)}
                            {membership.tier === 'vip' && (
                                <div className="octane-club-info-card">
                                    <strong>{LocalizeText('catalog.club.info.header')}</strong>
                                    <span>{LocalizeText('catalog.club.info.content')}</span>
                                </div>
                            )}
                        </section>
                        <section className="octane-club-vip-column">{offerGroups.vip.map(renderOffer)}</section>
                    </div>
                    {membership.active && <div className="octane-club-remaining">{LocalizeText(remainingKey, ['days'], [membership.totalDays.toString()])}</div>}
                    <button className="octane-club-center-link" type="button" onClick={() => CreateLinkEvent('habboUI/open/hccenter')}>
                        {LocalizeText('catalog.club.buy.link')}
                    </button>
                </>
            )}

            {pendingOffer && purchaseState !== CatalogPurchaseState.NONE && purchaseState !== CatalogPurchaseState.PURCHASE && (
                <CatalogClubPurchaseConfirmView
                    offer={pendingOffer}
                    productText={getPurchaseHeader(pendingOffer)}
                    validUntilText={getPurchaseValidUntil(pendingOffer)}
                    onCancel={() => {
                        setPurchaseWillBeGift(false);
                        setPendingOffer(null);
                        setPurchaseState(CatalogPurchaseState.NONE);
                    }}
                    onConfirm={confirmPendingOffer}
                />
            )}
        </div>
    );
};
