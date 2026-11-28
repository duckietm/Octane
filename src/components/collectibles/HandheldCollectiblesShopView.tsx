import { CollectibleShopOfferData } from '@octane/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback } from '../../api';
import emeraldMidIcon from '../../assets/images/collectibles/pursearea_mid_emerald_icon.png';
import emeraldIcon from '../../assets/images/collectibles/pursearea_tiny_emerald_icon.png';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../common/ToggleButton';
import { SHOP_CATEGORY_FALLBACKS } from '../../hooks/collectibles/collectibles.helpers';
import { getCollectibleProductName } from '../../hooks/collectibles/useCollectibles';
import { useHandheldLayout } from '../../hooks/handheld/useHandheldLayout';
import { CollectibleProductImageView } from './CollectibleProductImageView';
import {
    HandheldCollectiblesActions,
    HandheldCollectiblesBack,
    HandheldCollectiblesFacts,
    HandheldCollectiblesPrice,
    HandheldCollectiblesStage
} from './HandheldCollectiblesParts';

export interface HandheldCollectiblesShopViewProps {
    groups: { categoryKey: string; offers: CollectibleShopOfferData[] }[];
    categoryKey: string;
    offer: CollectibleShopOfferData | null;
    purchasePending: boolean;
    /** Whether an offer still has mints left (the desktop's buy rule). */
    isAvailable: (offer: CollectibleShopOfferData) => boolean;
    onCategory: (categoryKey: string) => void;
    onSelect: (productCode: string) => void;
    onBuy: () => void;
}

/**
 * The Shop tab on a phone: the categories as chips, the offers as tiles with their price; an offer opens as a page with
 * its picture, type, rarity, XP and mints, and price + Buy in the bar at the foot (upright), or beside the tiles (on
 * its side, where the first offer shows until another is picked). Buying goes through the tab's own handler.
 */
export const HandheldCollectiblesShopView: FC<HandheldCollectiblesShopViewProps> = (props) => {
    const { groups, categoryKey, offer, purchasePending, isAvailable, onCategory, onSelect, onBuy } = props;
    const { orientation } = useHandheldLayout();
    const sideBySide = orientation === 'landscape';
    const [open, setOpen] = useState(false);
    const showDetail = !!offer && (sideBySide || open);
    const group = groups.find((entry) => entry.categoryKey === categoryKey) ?? groups[0] ?? null;

    return (
        <NativeTextTree>
            <div className="octane-handheld-collectibles__panes" data-page={showDetail ? 'detail' : 'list'} data-testid="collectibles-shop">
                {(sideBySide || !showDetail) && (
                    <section className="octane-handheld-collectibles__pane is-list">
                        <div className="octane-handheld-collectibles__scroll">
                            {groups.length > 1 && (
                                <div className="octane-handheld-collectibles__chips">
                                    {groups.map((entry) => (
                                        <ToggleButton
                                            key={entry.categoryKey}
                                            className="octane-handheld-collectibles__chip"
                                            pressed={group?.categoryKey === entry.categoryKey}
                                            onClick={() => {
                                                onCategory(entry.categoryKey);
                                                setOpen(false);
                                            }}
                                        >
                                            {localizeWithFallback(entry.categoryKey, SHOP_CATEGORY_FALLBACKS[entry.categoryKey] ?? entry.categoryKey)}
                                        </ToggleButton>
                                    ))}
                                </div>
                            )}
                            <div className="octane-handheld-collectibles__tiles is-wide">
                                {group?.offers.map((entry) => (
                                    <ToggleButton
                                        key={entry.productCode}
                                        aria-label={getCollectibleProductName(entry.product)}
                                        className="octane-handheld-collectibles__tile"
                                        data-soldout={!isAvailable(entry)}
                                        data-testid={`collectibles-offer-${entry.productCode}`}
                                        pressed={sideBySide && offer?.productCode === entry.productCode}
                                        onClick={() => {
                                            onSelect(entry.productCode);
                                            setOpen(true);
                                        }}
                                    >
                                        <span className="octane-handheld-collectibles__tile-image">
                                            <CollectibleProductImageView icon product={entry.product} />
                                        </span>
                                        <span className="octane-handheld-collectibles__tile-name">{getCollectibleProductName(entry.product)}</span>
                                        <HandheldCollectiblesPrice amount={entry.emeraldPrice} icon={emeraldIcon} />
                                        {!isAvailable(entry) && (
                                            <span className="octane-handheld-collectibles__tag">
                                                {localizeWithFallback('octane.handheld.collectibles.sold_out', 'Sold out')}
                                            </span>
                                        )}
                                    </ToggleButton>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
                {showDetail && (
                    <section className="octane-handheld-collectibles__pane is-detail" data-testid="collectibles-shop-detail">
                        <div className="octane-handheld-collectibles__scroll">
                            {!sideBySide && <HandheldCollectiblesBack onClick={() => setOpen(false)} />}
                            <HandheldCollectiblesStage name={<span data-testid="collectibles-shop-name">{getCollectibleProductName(offer.product)}</span>}>
                                <CollectibleProductImageView product={offer.product} />
                            </HandheldCollectiblesStage>
                            <HandheldCollectiblesFacts product={offer.product} />
                            {offer.mintLimit > 0 && (
                                <div className="octane-handheld-collectibles__note" data-testid="collectibles-mint-limit">
                                    {localizeWithFallback(
                                        'octane.handheld.collectibles.minted',
                                        '%count% of %limit% minted',
                                        ['count', 'limit'],
                                        [String(offer.mintedCount), String(offer.mintLimit)]
                                    )}
                                </div>
                            )}
                        </div>
                        <HandheldCollectiblesActions>
                            <HandheldCollectiblesPrice amount={offer.emeraldPrice} className="is-large" icon={emeraldMidIcon} />
                            <BaseButton
                                className="octane-handheld-collectibles__button is-primary"
                                data-testid="collectibles-buy"
                                disabled={!isAvailable(offer) || purchasePending}
                                onClick={onBuy}
                            >
                                {localizeWithFallback('generic.buy', 'Buy')}
                            </BaseButton>
                        </HandheldCollectiblesActions>
                    </section>
                )}
            </div>
        </NativeTextTree>
    );
};
