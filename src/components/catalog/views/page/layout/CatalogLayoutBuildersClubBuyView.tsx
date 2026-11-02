import { ClubOfferData, PurchaseFromCatalogComposer } from '@octane/renderer';
import { FC, useCallback, useRef, useState } from 'react';
import {
    CatalogPurchaseState,
    GetConfigurationValue,
    handleInternalLinkClick,
    LocalizeText,
    localizeWithFallback,
    SanitizeHtmlWithInternalLinks,
    SendMessageComposer
} from '../../../../../api';
import { LayoutCurrencyIcon, LayoutLoadingSpinnerView } from '../../../../../common';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import {
    CatalogEvent,
    CatalogPurchasedEvent,
    CatalogPurchaseFailureEvent,
    CatalogPurchaseNotAllowedEvent,
    CatalogPurchaseSoldOutEvent
} from '../../../../../events';
import { useCatalogData, useCatalogSkipPurchaseConfirmation, useClubOffers, usePurse, useUiEvent } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';

const BUILDERS_CLUB_WINDOW_ID = 2;
const BUILDERS_CLUB_ADDONS_WINDOW_ID = 3;

const offerName = (offer: ClubOfferData) => {
    const localized = LocalizeText(offer.productCode);

    return localized && localized !== offer.productCode ? localized : offer.productCode.replace(/_/g, ' ');
};

/** What an offer gives: months and days of membership, or furni slots on the add-ons page. */
const offerMeta = (offer: ClubOfferData, isAddon: boolean) => {
    if (isAddon) {
        const units = offer.months * 31 + offer.extraDays;

        return units > 0 ? `+${units}` : '';
    }

    const parts: string[] = [];

    if (offer.months > 0) parts.push(LocalizeText('catalog.vip.item.header.months', ['num_months'], [offer.months.toString()]));
    if (offer.extraDays > 0) parts.push(LocalizeText('catalog.vip.item.header.days', ['num_days'], [offer.extraDays.toString()]));

    return parts.join(' ');
};

/**
 * AIR layout_builders_club_frontpage / _addons / _loyalty with the BuilderSubscription / BuilderAddons / BuilderLoyalty
 * widgets, stretched over the catalog page: the description (`ctlg_description`, text 0) on top, the Builders Club art
 * (catalogue/bc_top.png, bc_bottom.png) on the right of the add-ons and loyalty pages, and one row per offer: a header
 * bar with the Builders Club icon and the offer's name, its price, and the buy button. AIR's front page sends players
 * to the web shop; this hotel sells the membership in the client, so the front page lists those offers in the same
 * rows. On the add-ons page buying needs a running membership (AIR's trial warning).
 */
export const CatalogLayoutBuildersClubBuyView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { secondsLeft = 0 } = useCatalogData();
    const layout = page?.layoutCode ?? 'builders_club_frontpage';
    const isAddon = layout === 'builders_club_addons';
    const showArt = layout !== 'builders_club_frontpage';
    const { data: offers = null } = useClubOffers(isAddon ? BUILDERS_CLUB_ADDONS_WINDOW_ID : BUILDERS_CLUB_WINDOW_ID);
    const { getCurrencyAmount = null } = usePurse();
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const [pendingOffer, setPendingOffer] = useState<ClubOfferData>(null);
    const [purchaseState, setPurchaseState] = useState(CatalogPurchaseState.NONE);
    const isPurchasingRef = useRef(false);
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const isMember = secondsLeft > 0;
    const description = page?.localization?.getText(0) || page?.localization?.getText(1) || '';

    const onCatalogEvent = useCallback((event: CatalogEvent) => {
        if (!isPurchasingRef.current) return;

        isPurchasingRef.current = false;
        setPurchaseState(event.type === CatalogPurchasedEvent.PURCHASE_SUCCESS ? CatalogPurchaseState.NONE : CatalogPurchaseState.FAILED);
    }, []);

    useUiEvent(CatalogPurchasedEvent.PURCHASE_SUCCESS, onCatalogEvent);
    useUiEvent(CatalogPurchaseFailureEvent.PURCHASE_FAILED, onCatalogEvent);
    // "Not allowed" and "sold out" end the purchase too: they used to leave it pending until the catalog closed.
    useUiEvent(CatalogPurchaseNotAllowedEvent.NOT_ALLOWED, onCatalogEvent);
    useUiEvent(CatalogPurchaseSoldOutEvent.SOLD_OUT, onCatalogEvent);

    const purchase = (offer: ClubOfferData) => {
        if (!page || isPurchasingRef.current) return;

        isPurchasingRef.current = true;
        setPendingOffer(offer);
        setPurchaseState(CatalogPurchaseState.PURCHASE);
        SendMessageComposer(new PurchaseFromCatalogComposer(page.pageId, offer.offerId, null, 1));
    };

    const canAfford = (offer: ClubOfferData) =>
        offer.priceCredits <= (getCurrencyAmount?.(-1) ?? 0) && offer.priceActivityPoints <= (getCurrencyAmount?.(offer.priceActivityPointsType) ?? 0);

    const buyButton = (offer: ClubOfferData) => {
        const isPending = pendingOffer?.offerId === offer.offerId;
        const state = isPending ? purchaseState : CatalogPurchaseState.NONE;

        if (isAddon && !isMember) {
            return (
                <NativeTextTree>
                    <BaseButton disabled className="octane-catalog-air-bc__buy">
                        {LocalizeText('buy')}
                    </BaseButton>
                </NativeTextTree>
            );
        }

        if (!canAfford(offer)) {
            return (
                <NativeTextTree>
                    <BaseButton disabled className="octane-catalog-air-bc__buy is-short">
                        {offer.priceCredits > (getCurrencyAmount?.(-1) ?? 0)
                            ? LocalizeText('catalog.alert.notenough.title')
                            : LocalizeText(`catalog.alert.notenough.activitypoints.title.${offer.priceActivityPointsType}`)}
                    </BaseButton>
                </NativeTextTree>
            );
        }

        switch (state) {
            case CatalogPurchaseState.CONFIRM:
                return (
                    <NativeTextTree>
                        <BaseButton className="octane-catalog-air-bc__buy is-confirm" onClick={() => purchase(offer)}>
                            {LocalizeText('catalog.marketplace.confirm_title')}
                        </BaseButton>
                    </NativeTextTree>
                );
            case CatalogPurchaseState.PURCHASE:
                return (
                    <NativeTextTree>
                        <BaseButton disabled className="octane-catalog-air-bc__buy">
                            <LayoutLoadingSpinnerView />
                        </BaseButton>
                    </NativeTextTree>
                );
            case CatalogPurchaseState.FAILED:
                return (
                    <NativeTextTree>
                        <BaseButton disabled className="octane-catalog-air-bc__buy is-short">
                            {LocalizeText('generic.failed')}
                        </BaseButton>
                    </NativeTextTree>
                );
            default:
                return (
                    <NativeTextTree>
                        <BaseButton
                            className="octane-catalog-air-bc__buy"
                            onClick={() => {
                                if (catalogSkipPurchaseConfirmation) {
                                    purchase(offer);
                                    return;
                                }

                                setPendingOffer(offer);
                                setPurchaseState(CatalogPurchaseState.CONFIRM);
                            }}
                        >
                            {LocalizeText('buy')}
                        </BaseButton>
                    </NativeTextTree>
                );
        }
    };

    return (
        <NativeTextTree>
            <div className={`octane-catalog-air-bc is-${layout.replace('builders_club_', '')}`}>
                {!!description && (
                    <div
                        className="octane-catalog-air-bc__description"
                        onClick={handleInternalLinkClick}
                        dangerouslySetInnerHTML={{ __html: SanitizeHtmlWithInternalLinks(description) }}
                    />
                )}
                <div className="octane-catalog-air-bc__list">
                    {!offers && <LayoutLoadingSpinnerView />}
                    {offers?.map((offer) => {
                        const meta = offerMeta(offer, isAddon);

                        return (
                            <div key={offer.offerId} className="octane-catalog-air-bc__item">
                                <div className="octane-catalog-air-bc__item-head">
                                    {!!imageLibraryUrl && <img alt="" draggable={false} src={`${imageLibraryUrl}catalogue/icon_193.png`} />}
                                    <span>{offerName(offer)}</span>
                                </div>
                                <div className="octane-catalog-air-bc__item-body">
                                    <div className="octane-catalog-air-bc__price">
                                        {offer.priceCredits > 0 && (
                                            <>
                                                <span>{offer.priceCredits}</span>
                                                <LayoutCurrencyIcon type={-1} />
                                            </>
                                        )}
                                        {offer.priceActivityPoints > 0 && (
                                            <>
                                                <span>{offer.priceActivityPoints}</span>
                                                <LayoutCurrencyIcon type={offer.priceActivityPointsType} />
                                            </>
                                        )}
                                        {!!meta && <small>{meta}</small>}
                                    </div>
                                    {buyButton(offer)}
                                </div>
                            </div>
                        );
                    })}
                    {isAddon && !isMember && (
                        <div className="octane-catalog-air-bc__warning" role="status">
                            {localizeWithFallback('builder.addon_page.warning.trial', 'You need a Builders Club membership to buy add-ons.')}
                        </div>
                    )}
                </div>
                {showArt && !!imageLibraryUrl && (
                    <div aria-hidden="true" className="octane-catalog-air-bc__art">
                        <img alt="" draggable={false} src={`${imageLibraryUrl}catalogue/bc_top.png`} />
                        <img alt="" draggable={false} src={`${imageLibraryUrl}catalogue/bc_bottom.png`} />
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
