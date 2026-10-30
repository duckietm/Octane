import { CollectibleShopOfferData } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { ToggleButton } from '../../common/ToggleButton';
import { groupShopOffers, PRODUCT_TYPE_FALLBACKS, productTypeKey, SHOP_CATEGORY_FALLBACKS } from '../../hooks/collectibles/collectibles.helpers';
import { getCollectibleProductName, useCollectibles } from '../../hooks/collectibles/useCollectibles';
import { useNotification } from '../../hooks/notification';
import emeraldIcon from '../../assets/images/collectibles/pursearea_tiny_emerald_icon.png';
import { CollectibleProductImageView } from './CollectibleProductImageView';
import { CollectiblesLoadingView } from './CollectiblesLoadingView';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/** `ShopTab`: the shop's categories, the offers of the picked one, and the picked offer's preview and price. */
export const CollectiblesShopTabView: FC = () => {
    const { shopOffers = null, emeralds = 0, purchase = null, purchasePending = false } = useCollectibles();
    const { simpleAlert = null, showConfirm = null } = useNotification();
    const [categoryKey, setCategoryKey] = useState<string>(null);
    const [selectedCode, setSelectedCode] = useState<string>(null);
    const groups = useMemo(() => groupShopOffers(shopOffers ?? []), [shopOffers]);
    const group = groups.find((entry) => entry.categoryKey === categoryKey) ?? groups[0] ?? null;
    const offer: CollectibleShopOfferData = group?.offers.find((entry) => entry.productCode === selectedCode) ?? group?.offers[0] ?? null;

    if (shopOffers === null) return <CollectiblesLoadingView />;

    if (!groups.length) {
        return <div className="octane-collectibles-empty">{localizeWithFallback('collectibles.shop.empty', 'There is nothing for sale right now.')}</div>;
    }

    /** `ShopTab.onClickBuy`: too few emeralds is an alert, otherwise the purchase is confirmed first. */
    const buy = () => {
        if (!offer) return;

        if (emeralds < offer.emeraldPrice) {
            simpleAlert?.(
                localizeWithFallback('catalog.alert.notenough.activitypoints.description.1001', 'You do not have enough emeralds.'),
                null,
                null,
                null,
                localizeWithFallback('catalog.alert.notenough.activitypoints.title.1001', 'Not enough emeralds')
            );
            return;
        }

        const name = getCollectibleProductName(offer.product);

        showConfirm?.(
            localizeWithFallback('collectibles.shop.confirm', `Buy ${name} for ${offer.emeraldPrice} emeralds?`, ['name', 'price'], [name, String(offer.emeraldPrice)]),
            () => purchase?.(offer),
            null,
            localizeWithFallback('generic.buy', 'Buy'),
            null,
            localizeWithFallback('catalog.purchase_confirmation.title', 'Confirm purchase')
        );
    };

    return (
        <NativeTextTree>
            <div className="octane-collectibles-split" data-testid="collectibles-shop">
                <div className="octane-collectibles-side">
                    <div className="octane-collectibles-navigation is-tall">
                        {groups.map((entry) => (
                            <ToggleButton
                                key={entry.categoryKey}
                                className={`octane-collectibles-navigation-item${group?.categoryKey === entry.categoryKey ? ' is-active' : ''}`}
                                pressed={group?.categoryKey === entry.categoryKey}
                                onClick={() => {
                                    setCategoryKey(entry.categoryKey);
                                    setSelectedCode(null);
                                }}
                            >
                                <span className="octane-collectibles-navigation-title">
                                    {localizeWithFallback(entry.categoryKey, SHOP_CATEGORY_FALLBACKS[entry.categoryKey] ?? entry.categoryKey)}
                                </span>
                            </ToggleButton>
                        ))}
                    </div>
                </div>
                <div className="octane-collectibles-collection">
                    <div className="octane-collectibles-preview is-shop">
                        <div className="octane-collectibles-preview-star" />
                        <div className="octane-collectibles-preview-image">{offer && <CollectibleProductImageView product={offer.product} />}</div>
                        {offer && (
                            <>
                                <div className="octane-collectibles-preview-name" data-testid="collectibles-shop-name">
                                    {getCollectibleProductName(offer.product)}
                                </div>
                                <div className="octane-collectibles-preview-info is-shop">
                                    <div>
                                        <span>{localizeWithFallback('collectibles.item.type', 'Type')}</span>
                                        <span>
                                            {localizeWithFallback(
                                                productTypeKey(offer.product.productTypeId),
                                                PRODUCT_TYPE_FALLBACKS[productTypeKey(offer.product.productTypeId)] ?? ''
                                            )}
                                        </span>
                                    </div>
                                    <div>
                                        <span>{localizeWithFallback('collectibles.item.rarity', 'Rarity')}</span>
                                        <span>{offer.product.rarity}</span>
                                    </div>
                                    <div>
                                        <span>{localizeWithFallback('collectibles.item.xp', 'XP')}</span>
                                        <span>{offer.product.score}</span>
                                    </div>
                                </div>
                                <div className="octane-collectibles-buy-bar">
                                    {offer.mintLimit > 0 && (
                                        <span className="octane-collectibles-mint-limit" data-testid="collectibles-mint-limit">
                                            {`${offer.mintedCount}/${offer.mintLimit}`}
                                        </span>
                                    )}
                                    <span className="octane-collectibles-price">
                                        {offer.emeraldPrice}
                                        <img alt="" draggable={false} src={emeraldIcon} />
                                    </span>
                                    <BaseButton className="octane-collectibles-button is-green" disabled={!(offer.mintLimit === -1 || offer.mintedCount < offer.mintLimit) || purchasePending} onClick={buy}>
                                        {localizeWithFallback('generic.buy', 'Buy')}
                                    </BaseButton>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="octane-collectibles-item-grid">
                        {group?.offers.map((entry) => (
                            <ToggleButton
                                key={entry.productCode}
                                aria-label={getCollectibleProductName(entry.product)}
                                className={`octane-collectibles-item${offer?.productCode === entry.productCode ? ' is-selected' : ''}`}
                                pressed={offer?.productCode === entry.productCode}
                                onClick={() => setSelectedCode(entry.productCode)}
                            >
                                <CollectibleProductImageView icon product={entry.product} />
                                <span className="octane-collectibles-item-amount">{entry.emeraldPrice}</span>
                            </ToggleButton>
                        ))}
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
