import { ClubOfferData, PurchaseFromCatalogComposer } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CatalogPurchaseState, LocalizeText, SanitizeHtml, SendMessageComposer } from '../../../../../api';
import { Button, Column, Flex, Grid, LayoutCurrencyIcon, LayoutGridItem, LayoutLoadingSpinnerView, Text } from '../../../../../common';
import { CatalogEvent, CatalogPurchasedEvent, CatalogPurchaseFailureEvent } from '../../../../../events';
import { useCatalogData, useCatalogSkipPurchaseConfirmation, useClubOffers, usePurse, useUiEvent } from '../../../../../hooks';
import { CatalogHeaderView } from '../../catalog-header/CatalogHeaderView';
import { CatalogLayoutProps } from './CatalogLayout.types';

const BUILDERS_CLUB_WINDOW_ID = 2;
const BUILDERS_CLUB_ADDONS_WINDOW_ID = 3;

export const CatalogLayoutBuildersClubBuyView: FC<CatalogLayoutProps> = () => {
    const [pendingOffer, setPendingOffer] = useState<ClubOfferData>(null);
    const [purchaseState, setPurchaseState] = useState(CatalogPurchaseState.NONE);
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const { currentPage = null } = useCatalogData();
    const { getCurrencyAmount = null } = usePurse();
    const isPurchasingRef = useRef(false);
    const isAddonLayout = currentPage?.layoutCode === 'builders_club_addons';
    const windowId = isAddonLayout ? BUILDERS_CLUB_ADDONS_WINDOW_ID : BUILDERS_CLUB_WINDOW_ID;
    const { data: offers = null } = useClubOffers(windowId);

    const onCatalogEvent = useCallback((event: CatalogEvent) => {
        switch (event.type) {
            case CatalogPurchasedEvent.PURCHASE_SUCCESS:
                isPurchasingRef.current = false;
                setPurchaseState(CatalogPurchaseState.NONE);
                return;
            case CatalogPurchaseFailureEvent.PURCHASE_FAILED:
                isPurchasingRef.current = false;
                setPurchaseState(CatalogPurchaseState.FAILED);
                return;
        }
    }, []);

    useUiEvent(CatalogPurchasedEvent.PURCHASE_SUCCESS, onCatalogEvent);
    useUiEvent(CatalogPurchaseFailureEvent.PURCHASE_FAILED, onCatalogEvent);

    const getOfferTotalUnits = useCallback((offer: ClubOfferData) => {
        if (!offer) return 0;

        return offer.months * 31 + offer.extraDays;
    }, []);

    const getOfferName = useCallback((offer: ClubOfferData) => {
        if (!offer) return '';

        const localized = LocalizeText(offer.productCode);

        if (localized && localized !== offer.productCode) return localized;

        return offer.productCode.replace(/_/g, ' ');
    }, []);

    const getOfferMeta = useCallback(
        (offer: ClubOfferData) => {
            if (!offer) return '';

            if (isAddonLayout) {
                const units = getOfferTotalUnits(offer);

                return units > 0 ? `+${units}` : '';
            }

            const parts: string[] = [];

            if (offer.months > 0) parts.push(LocalizeText('catalog.vip.item.header.months', ['num_months'], [offer.months.toString()]));
            if (offer.extraDays > 0) parts.push(LocalizeText('catalog.vip.item.header.days', ['num_days'], [offer.extraDays.toString()]));

            return parts.join(' ');
        },
        [getOfferTotalUnits, isAddonLayout]
    );

    const purchaseOffer = useCallback(() => {
        if (!pendingOffer || !currentPage || isPurchasingRef.current) return;

        isPurchasingRef.current = true;
        setPurchaseState(CatalogPurchaseState.PURCHASE);
        SendMessageComposer(new PurchaseFromCatalogComposer(currentPage.pageId, pendingOffer.offerId, null, 1));
    }, [pendingOffer, currentPage]);

    const getPurchaseButton = useCallback(() => {
        if (!pendingOffer) return null;

        if (pendingOffer.priceCredits > getCurrencyAmount(-1)) {
            return (
                <Button fullWidth variant="danger">
                    {LocalizeText('catalog.alert.notenough.title')}
                </Button>
            );
        }

        if (pendingOffer.priceActivityPoints > getCurrencyAmount(pendingOffer.priceActivityPointsType)) {
            return (
                <Button fullWidth variant="danger">
                    {LocalizeText(`catalog.alert.notenough.activitypoints.title.${pendingOffer.priceActivityPointsType}`)}
                </Button>
            );
        }

        switch (purchaseState) {
            case CatalogPurchaseState.CONFIRM:
                return (
                    <Button fullWidth variant="warning" onClick={purchaseOffer}>
                        {LocalizeText('catalog.marketplace.confirm_title')}
                    </Button>
                );
            case CatalogPurchaseState.PURCHASE:
                return (
                    <Button disabled fullWidth variant="primary">
                        <LayoutLoadingSpinnerView />
                    </Button>
                );
            case CatalogPurchaseState.FAILED:
                return (
                    <Button disabled fullWidth variant="danger">
                        {LocalizeText('generic.failed')}
                    </Button>
                );
            case CatalogPurchaseState.NONE:
            default:
                return (
                    <Button fullWidth variant="success" onClick={() => (catalogSkipPurchaseConfirmation ? purchaseOffer() : setPurchaseState(CatalogPurchaseState.CONFIRM))}>
                        {LocalizeText('buy')}
                    </Button>
                );
        }
    }, [getCurrencyAmount, pendingOffer, purchaseOffer, purchaseState, catalogSkipPurchaseConfirmation]);

    const pageDescription = useMemo(() => {
        if (!currentPage) return '';

        return currentPage.localization.getText(1) || currentPage.localization.getText(2) || currentPage.localization.getText(0) || '';
    }, [currentPage]);

    useEffect(() => {
        if (!offers || !offers.length) return;

        setPendingOffer((prevValue) => {
            if (prevValue && offers.some((offer) => offer.offerId === prevValue.offerId)) return prevValue;

            return offers[0];
        });
    }, [offers]);

    return (
        <div className="flex h-full flex-col gap-2">
            {currentPage?.localization?.getImage(0) && <CatalogHeaderView imageUrl={currentPage.localization.getImage(0)} />}
            <Grid>
                <Column fullHeight justifyContent="between" overflow="hidden" size={7}>
                    <Column gap={1} overflow="auto">
                        {offers &&
                            offers.length > 0 &&
                            offers.map((offer, index) => {
                                const meta = getOfferMeta(offer);

                                return (
                                    <LayoutGridItem
                                        key={index}
                                        alignItems="center"
                                        center={false}
                                        className="p-2"
                                        column={false}
                                        itemActive={pendingOffer?.offerId === offer.offerId}
                                        justifyContent="between"
                                        onClick={() => {
                                            setPurchaseState(CatalogPurchaseState.NONE);
                                            setPendingOffer(offer);
                                        }}
                                    >
                                        <Column gap={0}>
                                            <Text fontWeight="bold">{getOfferName(offer)}</Text>
                                            {meta.length > 0 && <Text small>{meta}</Text>}
                                        </Column>
                                        <div className="flex flex-col gap-1">
                                            {offer.priceCredits > 0 && (
                                                <Flex alignItems="center" gap={1} justifyContent="end">
                                                    <Text>{offer.priceCredits}</Text>
                                                    <LayoutCurrencyIcon type={-1} />
                                                </Flex>
                                            )}
                                            {offer.priceActivityPoints > 0 && (
                                                <Flex alignItems="center" gap={1} justifyContent="end">
                                                    <Text>{offer.priceActivityPoints}</Text>
                                                    <LayoutCurrencyIcon type={offer.priceActivityPointsType} />
                                                </Flex>
                                            )}
                                        </div>
                                    </LayoutGridItem>
                                );
                            })}
                    </Column>
                </Column>
                <Column gap={2} overflow="hidden" size={5}>
                    <Column center grow overflow="hidden">
                        {currentPage?.localization.getImage(1) && <img alt="" src={currentPage.localization.getImage(1)} />}
                        {pageDescription.length > 0 && <Text center dangerouslySetInnerHTML={{ __html: SanitizeHtml(pageDescription) }} overflow="auto" />}
                    </Column>
                    {pendingOffer && (
                        <Column fullWidth gap={1}>
                            <Text fontWeight="bold">{getOfferName(pendingOffer)}</Text>
                            {getOfferMeta(pendingOffer).length > 0 && <Text>{getOfferMeta(pendingOffer)}</Text>}
                            <Flex alignItems="end">
                                <Column grow gap={0}>
                                    <Text>{currentPage?.localization.getText(0) || ''}</Text>
                                </Column>
                                <div className="flex flex-col gap-1">
                                    {pendingOffer.priceCredits > 0 && (
                                        <Flex alignItems="center" gap={1} justifyContent="end">
                                            <Text>{pendingOffer.priceCredits}</Text>
                                            <LayoutCurrencyIcon type={-1} />
                                        </Flex>
                                    )}
                                    {pendingOffer.priceActivityPoints > 0 && (
                                        <Flex alignItems="center" gap={1} justifyContent="end">
                                            <Text>{pendingOffer.priceActivityPoints}</Text>
                                            <LayoutCurrencyIcon type={pendingOffer.priceActivityPointsType} />
                                        </Flex>
                                    )}
                                </div>
                            </Flex>
                            {getPurchaseButton()}
                        </Column>
                    )}
                </Column>
            </Grid>
        </div>
    );
};
