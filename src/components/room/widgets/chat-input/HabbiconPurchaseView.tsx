import { FC } from 'react';
import { localizeHabbiconName, localizeWithFallback, useHabbiconCatalog } from '../../../../api';
import { DraggableWindowPosition, LayoutCurrencyIcon, LayoutHabbiconImageView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { usePurse } from '../../../../hooks/purse/usePurse';
import { HabbiconPrice } from './HabbiconHubView';

export const HabbiconPurchaseView: FC = () => {
    const catalog = useHabbiconCatalog();
    const { getCurrencyAmount } = usePurse();
    const { purchase, pending } = catalog;
    const item = purchase.collection ? catalog.sets.find((set) => set.collectionId === purchase.id) : catalog.entries.find((entry) => entry.id === purchase.id);
    if (!item) return null;

    const title = 'title' in item ? item.title : localizeHabbiconName(item);
    const set = catalog.sets.find((set) => set.collectionId === item.collectionId);
    const missing = 'entries' in item ? item.entries.filter((entry) => !entry.owned && !entry.claimable) : [item];
    const creditsOnly = item.priceCredits > 0 && item.priceActivityPoints === 0;
    const pointsOnly = item.priceCredits === 0 && item.priceActivityPoints > 0;
    const comparablePrices =
        purchase.collection &&
        missing.every((entry) =>
            creditsOnly
                ? entry.priceCredits > 0 && entry.priceActivityPoints === 0
                : pointsOnly && entry.priceCredits === 0 && entry.priceActivityPoints > 0 && entry.activityPointType === item.activityPointType
        );
    const individualPrice = comparablePrices ? missing.reduce((total, entry) => total + entry.priceCredits + entry.priceActivityPoints, 0) : 0;
    const discount = Math.max(0, individualPrice - item.priceCredits - item.priceActivityPoints);
    const currencyType = creditsOnly ? -1 : item.activityPointType;
    const affordable = getCurrencyAmount(-1) >= item.priceCredits && getCurrencyAmount(item.activityPointType) >= item.priceActivityPoints;
    const close = () => {
        if (!pending) catalog.setPurchase(null);
    };
    const ownedCount = set?.entries.filter((entry) => entry.owned).length || 0;
    const progress = Math.min(set?.total || 0, ownedCount + 1);

    return (
        <OctaneCardView
            classNames={['habbicon-purchase-window']}
            frameStyle={3}
            isResizable={false}
            uniqueKey="habbicon-purchase"
            windowPosition={DraggableWindowPosition.CENTER}
        >
            <OctaneCardHeaderView headerText={localizeWithFallback('habbicon_purchase.confirm.title', 'Confirm purchase')} onCloseClick={close} />
            <div className="habbicon-purchase-body">
                <div className="habbicon-purchase-top">
                    <div className="habbicon-purchase-preview">
                        <LayoutHabbiconImageView id={purchase.id} collection={purchase.collection} />
                        <strong>{purchase.collection ? localizeWithFallback('habbicon_purchase.confirm.set.preview', 'Habicon set') : set?.title}</strong>
                    </div>
                    <div>
                        <h3>{title}</h3>
                        <p>
                            {localizeWithFallback(
                                purchase.collection ? 'habbicon_purchase.confirm.set.desc' : 'habbicon_purchase.confirm.habbicon.desc',
                                purchase.collection ? `Buy the ${title} set?` : 'Buy this Habicon?',
                                ['set_name'],
                                [title]
                            )}
                        </p>
                        <p className="habbicon-purchase-receive">
                            {purchase.collection
                                ? localizeWithFallback(
                                      'habbicon_purchase.confirm.set.receive',
                                      `You'll receive ${missing.length} Habicons`,
                                      ['count'],
                                      [String(missing.length)]
                                  )
                                : localizeWithFallback(
                                      'habbicon_purchase.confirm.habbicon.progress',
                                      `Progress after buy: ${progress} / ${set?.total || 0}`,
                                      ['progress', 'total'],
                                      [String(progress), String(set?.total || 0)]
                                  )}
                        </p>
                    </div>
                </div>
                {discount > 0 && (
                    <>
                        <div className="habbicon-purchase-total">
                            <span>{localizeWithFallback('catalog.purchase.confirmation.dialog.normal_price', 'Normal price')}</span>
                            <del className="habbicon-price">
                                {individualPrice}
                                <LayoutCurrencyIcon type={currencyType} />
                            </del>
                        </div>
                        <div className="habbicon-purchase-total">
                            <span>{localizeWithFallback('catalog.purchase.confirmation.dialog.discount', 'Discount')}</span>
                            <strong className="habbicon-price">
                                {discount}
                                <LayoutCurrencyIcon type={currencyType} />
                            </strong>
                        </div>
                    </>
                )}
                <div className="habbicon-purchase-total">
                    <span>{localizeWithFallback('catalog.purchase.confirmation.dialog.cost', 'Cost')}</span>
                    <HabbiconPrice {...item} />
                </div>
                {!affordable && (
                    <p role="alert">{localizeWithFallback('habbicon.purchase.insufficient_balance', 'You do not have enough currency for this purchase.')}</p>
                )}
                {catalog.error && <p role="alert">{catalog.error}</p>}
                <div className="habbicon-purchase-actions">
                    <button type="button" className="habbicon-action" disabled={!affordable || !!pending || missing.length === 0} onClick={catalog.buy}>
                        {localizeWithFallback(pending ? 'generic.loading' : 'generic.buy', pending ? 'Buying…' : 'Buy')}
                    </button>
                    <button type="button" className="habbicon-cancel" disabled={!!pending} onClick={close}>
                        {localizeWithFallback('generic.cancel', 'Cancel')}
                    </button>
                </div>
            </div>
        </OctaneCardView>
    );
};
