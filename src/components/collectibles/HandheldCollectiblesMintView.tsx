import { CollectibleMintableData, CollectibleMintTokenOfferData } from '@octane/renderer';
import { CSSProperties, FC, useState } from 'react';
import { FriendlyTime, localizeWithFallback, ProductTypeEnum } from '../../api';
import lockClosed from '../../assets/images/collectibles/collectables_lock_closed.png';
import lockOpen from '../../assets/images/collectibles/collectables_lock_open.png';
import tokenLarge from '../../assets/images/collectibles/minting_token_large.png';
import tokenSmall from '../../assets/images/collectibles/minting_token_small.png';
import silverIcon from '../../assets/images/collectibles/pursearea_mid_silver_icon.png';
import { LayoutFurniIconImageView, LayoutFurniImageView, Select } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../common/ToggleButton';
import { useHandheldLayout } from '../../hooks/handheld/useHandheldLayout';
import {
    HandheldCollectiblesActions,
    HandheldCollectiblesBack,
    HandheldCollectiblesBar,
    HandheldCollectiblesPrice,
    HandheldCollectiblesStage
} from './HandheldCollectiblesParts';

export interface HandheldCollectiblesMintViewProps {
    mintables: CollectibleMintableData[];
    selected: CollectibleMintableData | null;
    furniName: (mintable: CollectibleMintableData) => string;
    /** How many furni of the relic's type the inventory holds. */
    ownedCount: (mintable: CollectibleMintableData) => number;
    /** Whether Collect is enabled for the chosen relic (the desktop's `canMint`). */
    canCollect: boolean;
    timeLeft: number | null;
    timeFraction: number;
    tokens: number;
    tokenOffers: CollectibleMintTokenOfferData[];
    offerIndex: number;
    tokenOffer: CollectibleMintTokenOfferData | null;
    canBuyTokens: boolean;
    onSelect: (itemTypeId: number) => void;
    onCollect: () => void;
    onOfferIndex: (index: number) => void;
    onBuyTokens: () => void;
}

const keyOf = (mintable: CollectibleMintableData) => `${mintable.itemType}:${mintable.itemTypeId}`;
const productType = (mintable: CollectibleMintableData) => (mintable.itemType === 'i' ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR);

/**
 * The Minting tab ("Relics") on a phone: what relics are, the stamp balance with the stamp packs for silver, and the
 * relics as tiles with how many of the furni the inventory holds. A relic opens as a page with its picture, whether it
 * may be collected, the time left, and its stamp price + Collect in the bar at the foot (upright), or beside the list
 * (on its side). Collecting and buying stamps go through the tab's own handlers.
 */
export const HandheldCollectiblesMintView: FC<HandheldCollectiblesMintViewProps> = (props) => {
    const {
        mintables,
        selected,
        furniName,
        ownedCount,
        canCollect,
        timeLeft,
        timeFraction,
        tokens,
        tokenOffers,
        offerIndex,
        tokenOffer,
        canBuyTokens,
        onSelect,
        onCollect,
        onOfferIndex,
        onBuyTokens
    } = props;
    const { orientation } = useHandheldLayout();
    const sideBySide = orientation === 'landscape';
    const [open, setOpen] = useState(false);
    const showDetail = !!selected && (sideBySide || open);
    const stampsLabel = localizeWithFallback('collectibles.buy.mint.tokens', 'Buy more stamps');

    return (
        <NativeTextTree>
            <div className="octane-handheld-collectibles__panes is-mint" data-page={showDetail ? 'detail' : 'list'} data-testid="collectibles-mint">
                {(sideBySide || !showDetail) && (
                    <section className="octane-handheld-collectibles__pane is-list">
                        <div className="octane-handheld-collectibles__scroll">
                            <div className="octane-handheld-collectibles__card">
                                <div className="octane-handheld-collectibles__title">{localizeWithFallback('shop.minting.info.title', 'Relics')}</div>
                                <div className="octane-handheld-collectibles__text">
                                    {localizeWithFallback(
                                        'shop.minting.info.description',
                                        'Below you will find items you can turn into relics. We rotate the available relics regularly.'
                                    )}
                                </div>
                            </div>
                            <div className="octane-handheld-collectibles__stamps">
                                <div className="octane-handheld-collectibles__stamps-balance">
                                    <img alt="" draggable={false} src={tokenLarge} />
                                    <span className="octane-handheld-collectibles__stamps-text">
                                        <span>{localizeWithFallback('shop.minting.tokens', 'Stamps')}</span>
                                        <strong data-testid="collectibles-stamps">{tokens}</strong>
                                    </span>
                                </div>
                                {tokenOffers.length > 0 && (
                                    <div className="octane-handheld-collectibles__stamps-buy">
                                        <span className="octane-handheld-collectibles__stamps-label">{stampsLabel}</span>
                                        <Select
                                            aria-label={stampsLabel}
                                            className="octane-handheld-collectibles__select"
                                            value={String(offerIndex)}
                                            onChange={(event) => onOfferIndex(Number(event.target.value))}
                                        >
                                            {tokenOffers.map((entry, index) => (
                                                <option key={entry.offerId} value={String(index)}>
                                                    {entry.amount}
                                                </option>
                                            ))}
                                        </Select>
                                        <HandheldCollectiblesPrice amount={tokenOffer?.silverPrice ?? 0} icon={silverIcon} />
                                        <BaseButton
                                            className="octane-handheld-collectibles__button is-blue"
                                            data-testid="collectibles-buy-stamps"
                                            disabled={!canBuyTokens}
                                            onClick={onBuyTokens}
                                        >
                                            {localizeWithFallback('generic.buy', 'Buy')}
                                        </BaseButton>
                                    </div>
                                )}
                            </div>
                            <div className="octane-handheld-collectibles__tiles is-wide">
                                {mintables.map((mintable) => (
                                    <ToggleButton
                                        key={keyOf(mintable)}
                                        aria-label={furniName(mintable)}
                                        className="octane-handheld-collectibles__tile"
                                        data-testid={`collectibles-relic-${mintable.itemTypeId}`}
                                        pressed={sideBySide && !!selected && keyOf(selected) === keyOf(mintable)}
                                        onClick={() => {
                                            onSelect(mintable.itemTypeId);
                                            setOpen(true);
                                        }}
                                    >
                                        <span className="octane-handheld-collectibles__tile-image">
                                            <LayoutFurniIconImageView productClassId={mintable.itemTypeId} productType={productType(mintable)} />
                                        </span>
                                        <span className="octane-handheld-collectibles__tile-name">{furniName(mintable)}</span>
                                        <span className="octane-handheld-collectibles__badge">{`x${ownedCount(mintable)}`}</span>
                                    </ToggleButton>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
                {showDetail && (
                    <section className="octane-handheld-collectibles__pane is-detail" data-testid="collectibles-mint-detail">
                        <div className="octane-handheld-collectibles__scroll">
                            {!sideBySide && <HandheldCollectiblesBack onClick={() => setOpen(false)} />}
                            <HandheldCollectiblesStage name={furniName(selected)}>
                                <LayoutFurniImageView direction={2} productClassId={selected.itemTypeId} productType={productType(selected)} />
                            </HandheldCollectiblesStage>
                            <div className="octane-handheld-collectibles__row" data-locked={selected.regionLocked}>
                                <img alt="" draggable={false} src={selected.regionLocked ? lockClosed : lockOpen} />
                                <span>
                                    {selected.regionLocked
                                        ? localizeWithFallback('shop.minting.region_locked', 'This relic is locked.')
                                        : localizeWithFallback('shop.minting.region_unlocked', 'This relic can be collected.')}
                                </span>
                            </div>
                            {timeLeft !== null && (
                                <div
                                    className="octane-handheld-collectibles__timer is-card"
                                    style={{ '--hh-fill': `${Math.round(timeFraction * 100)}%` } as CSSProperties}
                                >
                                    <span>
                                        {timeLeft <= 0
                                            ? localizeWithFallback('shop.minting.time_ended', 'Minting period ended')
                                            : `${localizeWithFallback('shop.minting.time_left', 'Time left')}: ${FriendlyTime.format(timeLeft / 1000)}`}
                                    </span>
                                    <HandheldCollectiblesBar ratio={timeFraction} />
                                </div>
                            )}
                            {ownedCount(selected) === 0 && (
                                <div className="octane-handheld-collectibles__note is-warning">
                                    {localizeWithFallback('shop.minting.no_furni', "You don't have any relics to collect yet.")}
                                </div>
                            )}
                        </div>
                        <HandheldCollectiblesActions>
                            <HandheldCollectiblesPrice amount={selected.price} className="is-large" icon={tokenSmall} />
                            <BaseButton
                                className="octane-handheld-collectibles__button is-primary"
                                data-testid="collectibles-collect"
                                disabled={!canCollect}
                                onClick={onCollect}
                            >
                                {localizeWithFallback('collectibles.collect', 'Collect')}
                            </BaseButton>
                        </HandheldCollectiblesActions>
                    </section>
                )}
            </div>
        </NativeTextTree>
    );
};
