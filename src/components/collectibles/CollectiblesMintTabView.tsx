import { CollectibleMintableData, GetSessionDataManager } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FriendlyTime, localizeWithFallback, ProductTypeEnum } from '../../api';
import { LayoutFurniIconImageView, LayoutFurniImageView, Select } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { ToggleButton } from '../../common/ToggleButton';
import { canMint } from '../../hooks/collectibles/collectibles.helpers';
import { useCollectibles } from '../../hooks/collectibles/useCollectibles';
import { useInventoryFurni } from '../../hooks/inventory/useInventoryFurni';
import { useNotification } from '../../hooks/notification';
import lockClosed from '../../assets/images/collectibles/collectables_lock_closed.png';
import lockOpen from '../../assets/images/collectibles/collectables_lock_open.png';
import silverIcon from '../../assets/images/collectibles/pursearea_mid_silver_icon.png';
import tokenLarge from '../../assets/images/collectibles/minting_token_large.png';
import tokenSmall from '../../assets/images/collectibles/minting_token_small.png';
import { CollectiblesLoadingView } from './CollectiblesLoadingView';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

const furniName = (mintable: CollectibleMintableData): string => {
    const data = mintable.itemType === 'i' ? GetSessionDataManager().getWallItemData(mintable.itemTypeId) : GetSessionDataManager().getFloorItemData(mintable.itemTypeId);

    return data?.name ?? `${mintable.itemTypeId}`;
};

/**
 * `MintInventoryListTab` ("Relics"): furni of the inventory that can be turned into a collectible, the
 * stamps they cost and the stamp packs sold for silver.
 */
export const CollectiblesMintTabView: FC = () => {
    const {
        mintables = null,
        mintTokens = null,
        mintTokenOffers = [],
        mintingEnabled = false,
        mintPending = false,
        purchasePending = false,
        activeWallet = null,
        silver = 0,
        buyMintTokens = null,
        mint = null
    } = useCollectibles();
    const { groupItems = [], activate = null, deactivate = null } = useInventoryFurni();
    const { showConfirm = null } = useNotification();
    const [selectedId, setSelectedId] = useState<number>(null);
    const [offerIndex, setOfferIndex] = useState(0);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = activate?.();

        return () => deactivate?.(id);
    }, [activate, deactivate]);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(interval);
    }, []);

    /** `_r39d569dc247ac7`: the inventory furni of the relic's type. */
    const ownedIds = useMemo(() => {
        const ids = new Map<string, number[]>();

        for (const group of groupItems) {
            const key = `${group.isWallItem ? 'i' : 's'}:${group.type}`;
            const list = ids.get(key) ?? [];

            for (const item of group.items) if (!item.rentable) list.push(item.id);

            ids.set(key, list);
        }

        return ids;
    }, [groupItems]);

    if (mintables === null || mintTokens === null) return <CollectiblesLoadingView />;

    const idsOf = (mintable: CollectibleMintableData) => ownedIds.get(`${mintable.itemType}:${mintable.itemTypeId}`) ?? [];
    const selected = mintables.find((mintable) => mintable.itemTypeId === selectedId) ?? mintables[0] ?? null;
    const offer = mintTokenOffers[offerIndex] ?? mintTokenOffers[0] ?? null;
    const owned = selected ? idsOf(selected).length : 0;
    const enabled = selected
        ? canMint({
              hasWallet: !!activeWallet,
              furniOwned: owned,
              tokens: mintTokens,
              price: selected.price,
              endTime: selected.endTime,
              mintingEnabled,
              pending: mintPending,
              now
          })
        : false;
    const timeLeft = selected && selected.startTime > 0 && selected.endTime > 0 ? Math.max(0, selected.endTime * 1000 - now) : null;
    const timeFraction = timeLeft === null ? 0 : Math.min(1, timeLeft / Math.max(1, (selected.endTime - selected.startTime) * 1000));

    const onCollect = () => {
        if (!selected) return;

        showConfirm?.(
            localizeWithFallback('shop.minting.confirm.description', 'Click below to add this relic to your inventory.'),
            () => {
                const ids = idsOf(selected);

                if (ids.length) mint?.(ids[0]);
            },
            null,
            localizeWithFallback('shop.minting.confirm.yes', 'Collect'),
            null,
            localizeWithFallback('shop.minting.confirm.title', 'Confirm you want to collect')
        );
    };

    return (
        <NativeTextTree>
            <div className="octane-collectibles-mint" data-testid="collectibles-mint">
                <div className="octane-collectibles-mint-header">
                    <span className="octane-collectibles-mint-title">{localizeWithFallback('shop.minting.info.title', 'Relics')}</span>
                    <span>
                        {localizeWithFallback(
                            'shop.minting.info.description',
                            'Below you will find items you can turn into relics. We rotate the available relics regularly.'
                        )}
                    </span>
                </div>
                <div className="octane-collectibles-mint-body">
                    <div className="octane-collectibles-mint-grid">
                        {mintables.map((mintable) => (
                            <ToggleButton
                                key={`${mintable.itemType}:${mintable.itemTypeId}`}
                                aria-label={furniName(mintable)}
                                className={`octane-collectibles-item${selected === mintable ? ' is-selected' : ''}`}
                                pressed={selected === mintable}
                                onClick={() => setSelectedId(mintable.itemTypeId)}
                            >
                                <LayoutFurniIconImageView
                                    productClassId={mintable.itemTypeId}
                                    productType={mintable.itemType === 'i' ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR}
                                />
                                <span className="octane-collectibles-item-amount">{`x${idsOf(mintable).length}`}</span>
                            </ToggleButton>
                        ))}
                    </div>
                    {selected && (
                        <div className="octane-collectibles-mint-preview">
                            <div className="octane-collectibles-preview is-mint">
                                <div className="octane-collectibles-preview-star" />
                                <div className="octane-collectibles-preview-image">
                                    <LayoutFurniImageView
                                        direction={2}
                                        productClassId={selected.itemTypeId}
                                        productType={selected.itemType === 'i' ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR}
                                    />
                                </div>
                                <div className="octane-collectibles-preview-name">{furniName(selected)}</div>
                                <div className="octane-collectibles-mint-lock">
                                    <img alt="" draggable={false} src={selected.regionLocked ? lockClosed : lockOpen} />
                                    <span>
                                        {selected.regionLocked
                                            ? localizeWithFallback('shop.minting.region_locked', 'This relic is locked.')
                                            : localizeWithFallback('shop.minting.region_unlocked', 'This relic can be collected.')}
                                    </span>
                                </div>
                                {timeLeft !== null && (
                                    <div className="octane-collectibles-timer">
                                        <div className="octane-collectibles-timer-fill" style={{ width: `${Math.round(timeFraction * 100)}%` }} />
                                        <span className="octane-collectibles-timer-text">
                                            {timeLeft <= 0
                                                ? localizeWithFallback('shop.minting.time_ended', 'Minting period ended')
                                                : `${localizeWithFallback('shop.minting.time_left', 'Time left')}: ${FriendlyTime.format(timeLeft / 1000)}`}
                                        </span>
                                    </div>
                                )}
                                {owned === 0 && (
                                    <div className="octane-collectibles-mint-nofurni">
                                        {localizeWithFallback('shop.minting.no_furni', "You don't have any relics to collect yet.")}
                                    </div>
                                )}
                                <div className="octane-collectibles-buy-bar">
                                    <span className="octane-collectibles-price">
                                        {selected.price}
                                        <img alt="" draggable={false} src={tokenSmall} />
                                    </span>
                                    <BaseButton className="octane-collectibles-button is-green" disabled={!enabled} onClick={onCollect}>
                                        {localizeWithFallback('collectibles.collect', 'Collect')}
                                    </BaseButton>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="octane-collectibles-stamps">
                    <img alt="" className="octane-collectibles-stamps-icon" draggable={false} src={tokenLarge} />
                    <div className="octane-collectibles-stamps-balance">
                        <span>{localizeWithFallback('shop.minting.tokens', 'Stamps')}</span>
                        <span className="octane-collectibles-stamps-value" data-testid="collectibles-stamps">
                            {mintTokens}
                        </span>
                    </div>
                    {mintTokenOffers.length > 0 && (
                        <div className="octane-collectibles-stamps-buy">
                            <span>{localizeWithFallback('collectibles.buy.mint.tokens', 'Buy more stamps')}</span>
                            <Select
                                aria-label={localizeWithFallback('collectibles.buy.mint.tokens', 'Buy more stamps')}
                                className="octane-collectibles-select is-small"
                                value={String(offerIndex)}
                                onChange={(event) => setOfferIndex(Number(event.target.value))}
                            >
                                {mintTokenOffers.map((entry, index) => (
                                    <option key={entry.offerId} value={String(index)}>
                                        {entry.amount}
                                    </option>
                                ))}
                            </Select>
                            <span className="octane-collectibles-price">
                                {offer?.silverPrice ?? 0}
                                <img alt="" draggable={false} src={silverIcon} />
                            </span>
                            <BaseButton
                                className="octane-collectibles-button is-blue"
                                disabled={!offer || offer.silverPrice > silver || purchasePending}
                                onClick={() => buyMintTokens?.(offer)}
                            >
                                {localizeWithFallback('generic.buy', 'Buy')}
                            </BaseButton>
                        </div>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
