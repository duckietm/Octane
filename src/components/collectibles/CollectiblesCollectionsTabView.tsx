import { CollectibleCollectionData, CollectibleProductData } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FriendlyTime, LocalizeText, localizeWithFallback, SanitizeHtml } from '../../api';
import { Select } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { ToggleButton } from '../../common/ToggleButton';
import {
    bonusTimer,
    collectionOwnedCount,
    collectionPreview,
    collectionProgressColor,
    formatCollectibleDate,
    PRODUCT_TYPE_FALLBACKS,
    productTypeKey,
    sortCollections,
    toHexColor
} from '../../hooks/collectibles/collectibles.helpers';
import { getCollectibleProductName, useCollectibles } from '../../hooks/collectibles/useCollectibles';
import checkmarkIcon from '../../assets/images/collectibles/icon_checkmark_small.png';
import { CollectibleProductImageView } from './CollectibleProductImageView';
import { CollectiblesLoadingView } from './CollectiblesLoadingView';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

const html = (key: string, fallback: string, parameters: string[], replacements: string[]) =>
    SanitizeHtml(localizeWithFallback(key, fallback, parameters, replacements));

const collectionTitle = (collection: CollectibleCollectionData) =>
    localizeWithFallback(`collectibles.set.${collection.collectionId}`, collection.collectionName || collection.collectionId);

/** `CollectionView`: one set, its preview area (reward, bonus or the picked product) and its products. */
const CollectionDetailView: FC<{ collection: CollectibleCollectionData }> = ({ collection }) => {
    const { pendingClaims = {}, claimCollection = null } = useCollectibles();
    const [selected, setSelected] = useState<CollectibleProductData>(null);
    const [now, setNow] = useState(() => Date.now());
    const owned = collectionOwnedCount(collection);
    const total = collection.items.length;
    const preview = collectionPreview(collection, pendingClaims[collection.collectionId]);
    const timer = preview.kind === 'bonus' ? bonusTimer(collection.bonusStart, collection.bonusEnd, now) : null;
    const selectedItem = selected ? (collection.items.find((item) => item.productCode === selected.productCode) ?? null) : null;

    useEffect(() => setSelected(null), [collection.collectionId]);

    useEffect(() => {
        if (!timer?.visible || timer.expired) return;

        const interval = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(interval);
    }, [timer?.visible, timer?.expired]);

    const complete = owned === total && total > 0;

    return (
        <NativeTextTree>
            <div className="octane-collectibles-collection" data-testid="collectibles-collection">
                <div className="octane-collectibles-collection-header">
                    <span className="octane-collectibles-collection-name">{collectionTitle(collection)}</span>
                    <span className="octane-collectibles-progress-pill is-large" style={{ backgroundColor: toHexColor(collectionProgressColor(owned, total)) }}>
                        {`${owned}/${total}`}
                    </span>
                </div>
                <div className="octane-collectibles-preview">
                    <div className="octane-collectibles-preview-star" />
                    <div className="octane-collectibles-preview-image">
                        {selectedItem ? (
                            <CollectibleProductImageView product={selectedItem} />
                        ) : preview.kind === 'collection' ? (
                            <div className="octane-collectibles-collection-default" />
                        ) : (
                            <CollectibleProductImageView product={preview.product} />
                        )}
                    </div>
                    {selectedItem && (
                        <>
                            <div className="octane-collectibles-preview-name">{getCollectibleProductName(selectedItem)}</div>
                            <div className="octane-collectibles-preview-info">
                                <div>
                                    <span>{localizeWithFallback('collectibles.item.type', 'Type')}</span>
                                    <span>{localizeWithFallback(productTypeKey(selectedItem.productTypeId), PRODUCT_TYPE_FALLBACKS[productTypeKey(selectedItem.productTypeId)] ?? '')}</span>
                                </div>
                                <div>
                                    <span>{localizeWithFallback('collectibles.item.rarity', 'Rarity')}</span>
                                    <span>{selectedItem.rarity}</span>
                                </div>
                                <div>
                                    <span>{localizeWithFallback('collectibles.item.xp', 'XP')}</span>
                                    <span>{selectedItem.score}</span>
                                </div>
                            </div>
                            <div className="octane-collectibles-preview-bar">
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: html(
                                            selectedItem.amount > 0 ? 'collectibles.preview.product.complete' : 'collectibles.preview.product.incomplete',
                                            selectedItem.amount > 0 ? 'You earned <b>%amount%</b> XP with this item!' : 'Collect this item to get <b>%amount%</b> XP',
                                            ['amount'],
                                            [`<font color="#FFC800">${selectedItem.score}</font>`]
                                        )
                                    }}
                                />
                            </div>
                        </>
                    )}
                    {!selectedItem && preview.kind !== 'collection' && (
                        <div className="octane-collectibles-completion" data-testid="collectibles-completion">
                            <div className={`octane-collectibles-completion-header${timer?.visible ? ' has-timer' : ''}`}>
                                <span>{localizeWithFallback('collectibles.preview.completion_bonus', 'Completion bonus:')}</span>
                                <span className="octane-collectibles-completion-name">{getCollectibleProductName(preview.product)}</span>
                                {timer?.visible && (
                                    <div className="octane-collectibles-timer">
                                        <div
                                            className={`octane-collectibles-timer-fill${timer.expired ? ' is-expired' : ''}`}
                                            style={{ width: `${Math.round(timer.fraction * 100)}%` }}
                                        />
                                        <span className="octane-collectibles-timer-text">
                                            {timer.expired
                                                ? localizeWithFallback(
                                                      'collectibles.preview.bonus_claim_ended',
                                                      'Bonus item claim period ended - %date%',
                                                      ['date'],
                                                      [formatCollectibleDate(collection.bonusEnd)]
                                                  )
                                                : `${localizeWithFallback('collectibles.preview.time_left', 'Claim this item')}: ${FriendlyTime.format(timer.msLeft / 1000)}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {preview.claimable && (
                                <BaseButton
                                    className="octane-collectibles-button is-green octane-collectibles-claim-button"
                                    onClick={() => claimCollection?.(collection.collectionId, preview.kind === 'bonus')}
                                >
                                    {localizeWithFallback('collectibles.claim', 'Claim reward')}
                                </BaseButton>
                            )}
                        </div>
                    )}
                    {!selectedItem && (
                        <div className="octane-collectibles-collection-progress">
                            <span
                                dangerouslySetInnerHTML={{
                                    __html: html('collectibles.preview.score', 'My current XP for this set: <b>%progress% / %goal%</b>', ['progress', 'goal'], [
                                        `<font color="#00FF12">${collection.score}</font>`,
                                        `${collection.goal}`
                                    ])
                                }}
                            />
                            <div className="octane-collectibles-preview-bar">
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: html(
                                            complete ? 'collectibles.preview.reward_collected' : 'collectibles.preview.reward',
                                            complete ? 'You get an extra <b>%amount%</b> XP boost for this complete set!' : 'Complete the set for an extra <b>%amount%</b> XP',
                                            ['amount'],
                                            [`<font color="#FFC800">${collection.completionXp}</font>`]
                                        )
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="octane-collectibles-item-grid">
                    {collection.items.map((item) => (
                        <ToggleButton
                            key={item.productCode}
                            aria-label={getCollectibleProductName(item)}
                            className={`octane-collectibles-item${selectedItem?.productCode === item.productCode ? ' is-selected' : ''}${item.amount > 0 ? ' is-owned' : ''}`}
                            pressed={selectedItem?.productCode === item.productCode}
                            onClick={() => setSelected((current) => (current?.productCode === item.productCode ? null : item))}
                        >
                            <CollectibleProductImageView icon product={item} />
                            <span className="octane-collectibles-item-amount">{`x${item.amount}`}</span>
                            {item.amount > 0 && <img alt="" className="octane-collectibles-item-check" draggable={false} src={checkmarkIcon} />}
                        </ToggleButton>
                    ))}
                </div>
            </div>
        </NativeTextTree>
    );
};

/** `CollectionsTab`: the wallet, sort and search on the left with the sets, the picked set on the right. */
export const CollectiblesCollectionsTabView: FC = () => {
    const { collections = null } = useCollectibles();
    const [sortMode, setSortMode] = useState(0);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string>(null);

    const sorted = useMemo(() => (collections ? sortCollections(collections, sortMode) : []), [collections, sortMode]);
    const shown = useMemo(() => {
        const comparison = search.trim().toLowerCase();

        return comparison.length ? sorted.filter((collection) => collectionTitle(collection).toLowerCase().includes(comparison)) : sorted;
    }, [sorted, search]);
    const selected = sorted.find((collection) => collection.collectionId === selectedId) ?? sorted[0] ?? null;

    if (collections === null) return <CollectiblesLoadingView />;

    return (
        <NativeTextTree>
            <div className="octane-collectibles-split" data-testid="collectibles-collections">
                <div className="octane-collectibles-side">
                    <Select aria-label={LocalizeText('collectibles.selected_wallet')} className="octane-collectibles-select" disabled value="collector">
                        <option value="collector">{localizeWithFallback('collectibles.collector.wallet', 'Collector Wallet')}</option>
                    </Select>
                    <Select
                        aria-label={localizeWithFallback('collectibles.sort.default', 'Default')}
                        className="octane-collectibles-select"
                        value={String(sortMode)}
                        onChange={(event) => setSortMode(Number(event.target.value))}
                    >
                        <option value="0">{localizeWithFallback('collectibles.sort.default', 'Default')}</option>
                        <option value="1">{localizeWithFallback('collectibles.sort.progress', 'Progress')}</option>
                        <option value="2">{localizeWithFallback('collectibles.sort.score', 'Score')}</option>
                    </Select>
                    <input
                        aria-label={localizeWithFallback('generic.search', 'Search')}
                        className="octane-collectibles-search"
                        placeholder={localizeWithFallback('generic.search', 'Search')}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <div className="octane-collectibles-navigation">
                        {shown.map((collection) => {
                            const owned = collectionOwnedCount(collection);
                            const total = collection.items.length;

                            return (
                                <ToggleButton
                                    key={collection.collectionId}
                                    className={`octane-collectibles-navigation-item${selected?.collectionId === collection.collectionId ? ' is-active' : ''}`}
                                    pressed={selected?.collectionId === collection.collectionId}
                                    onClick={() => setSelectedId(collection.collectionId)}
                                >
                                    <span className="octane-collectibles-navigation-hint" style={{ backgroundColor: toHexColor(collectionProgressColor(owned, total)) }} />
                                    <span className="octane-collectibles-navigation-title">{collectionTitle(collection)}</span>
                                    <span className="octane-collectibles-progress-pill" style={{ backgroundColor: toHexColor(collectionProgressColor(owned, total)) }}>
                                        {`${total ? Math.floor((owned * 100) / total) : 0}%`}
                                    </span>
                                </ToggleButton>
                            );
                        })}
                    </div>
                </div>
                {selected ? <CollectionDetailView collection={selected} /> : <div className="octane-collectibles-empty">{localizeWithFallback('collectibles.collections.empty', 'There are no collections yet.')}</div>}
            </div>
        </NativeTextTree>
    );
};
