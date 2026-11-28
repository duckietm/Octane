import { CollectibleCollectionData, CollectibleProductData } from '@octane/renderer';
import { CSSProperties, FC, ReactNode, useState } from 'react';
import { FriendlyTime, localizeWithFallback, SanitizeHtml } from '../../api';
import checkmarkIcon from '../../assets/images/collectibles/icon_checkmark_small.png';
import { Select } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../common/ToggleButton';
import {
    CollectionPreview,
    collectionOwnedCount,
    collectionProgressColor,
    formatCollectibleDate,
    toHexColor
} from '../../hooks/collectibles/collectibles.helpers';
import { getCollectibleProductName } from '../../hooks/collectibles/useCollectibles';
import { useHandheldLayout } from '../../hooks/handheld/useHandheldLayout';
import { CollectibleProductImageView } from './CollectibleProductImageView';
import {
    HandheldCollectiblesActions,
    HandheldCollectiblesBack,
    HandheldCollectiblesBar,
    HandheldCollectiblesChevron,
    HandheldCollectiblesFacts,
    HandheldCollectiblesStage
} from './HandheldCollectiblesParts';

const html = (key: string, fallback: string, parameters: string[], replacements: string[]) => ({
    __html: SanitizeHtml(localizeWithFallback(key, fallback, parameters, replacements))
});

export interface HandheldCollectiblesCollectionsViewProps {
    /** Every set the wallet has (before the search). */
    total: number;
    /** The sets after sort and search. */
    shown: CollectibleCollectionData[];
    title: (collection: CollectibleCollectionData) => string;
    selectedId: string | null;
    sortMode: number;
    search: string;
    onSort: (mode: number) => void;
    onSearch: (search: string) => void;
    onSelect: (collectionId: string) => void;
    /** The chosen set's page; `onBack` is null on its side, where list and page are both on screen. */
    renderDetail: (onBack: (() => void) | null) => ReactNode;
}

/**
 * The Collections tab on a phone: sort and search on top, the sets as tiles (picture of the prize, name, a bar of the
 * share owned in the set's progress colour). A set opens as a page (upright) or beside the tiles (on its side, where
 * the first set shows until another is picked).
 */
export const HandheldCollectiblesCollectionsView: FC<HandheldCollectiblesCollectionsViewProps> = (props) => {
    const { total, shown, title, selectedId, sortMode, search, onSort, onSearch, onSelect, renderDetail } = props;
    const { orientation } = useHandheldLayout();
    const sideBySide = orientation === 'landscape';
    // Upright the chosen set is a page of its own; on its side it is always beside the tiles.
    const [opened, setOpened] = useState(false);
    const showDetail = !!selectedId && (sideBySide || opened);
    const searchLabel = localizeWithFallback('generic.search', 'Search');

    return (
        <NativeTextTree>
            <div className="octane-handheld-collectibles__panes" data-page={showDetail ? 'detail' : 'list'} data-testid="collectibles-collections">
                {(sideBySide || !showDetail) && (
                    <section className="octane-handheld-collectibles__pane is-list">
                        <div className="octane-handheld-collectibles__toolbar">
                            <input
                                aria-label={searchLabel}
                                autoCapitalize="off"
                                autoComplete="off"
                                className="octane-handheld-collectibles__input is-search"
                                enterKeyHint="search"
                                placeholder={searchLabel}
                                spellCheck={false}
                                type="search"
                                value={search}
                                onChange={(event) => onSearch(event.target.value)}
                            />
                            <Select
                                aria-label={localizeWithFallback('octane.handheld.collectibles.sort', 'Sort')}
                                className="octane-handheld-collectibles__select"
                                value={String(sortMode)}
                                onChange={(event) => onSort(Number(event.target.value))}
                            >
                                <option value="0">{localizeWithFallback('collectibles.sort.default', 'Default')}</option>
                                <option value="1">{localizeWithFallback('collectibles.sort.progress', 'Progress')}</option>
                                <option value="2">{localizeWithFallback('collectibles.sort.score', 'Score')}</option>
                            </Select>
                        </div>
                        <div className="octane-handheld-collectibles__scroll">
                            {!total && (
                                <div className="octane-handheld-collectibles__empty">
                                    {localizeWithFallback('collectibles.collections.empty', 'There are no collections yet.')}
                                </div>
                            )}
                            {!!total && !shown.length && (
                                <div className="octane-handheld-collectibles__empty">
                                    {localizeWithFallback('octane.handheld.collectibles.no_match', 'No collection matches your search.')}
                                </div>
                            )}
                            <div className="octane-handheld-collectibles__sets">
                                {shown.map((collection) => {
                                    const owned = collectionOwnedCount(collection);
                                    const count = collection.items.length;
                                    const color = toHexColor(collectionProgressColor(owned, count));
                                    const picture = collection.rewardItem ?? collection.bonusItem ?? collection.items[0] ?? null;

                                    return (
                                        <ToggleButton
                                            key={collection.collectionId}
                                            className="octane-handheld-collectibles__set"
                                            data-complete={owned === count && count > 0}
                                            data-testid={`collectibles-set-${collection.collectionId}`}
                                            pressed={sideBySide && selectedId === collection.collectionId}
                                            style={{ '--collectibles-progress': color } as CSSProperties}
                                            onClick={() => {
                                                onSelect(collection.collectionId);
                                                setOpened(true);
                                            }}
                                        >
                                            <span className="octane-handheld-collectibles__thumb">
                                                <CollectibleProductImageView icon product={picture} />
                                            </span>
                                            <span className="octane-handheld-collectibles__set-text">
                                                <span className="octane-handheld-collectibles__set-name">{title(collection)}</span>
                                                <span className="octane-handheld-collectibles__set-progress">
                                                    <HandheldCollectiblesBar color={color} ratio={count ? owned / count : 0} />
                                                    <span className="octane-handheld-collectibles__count">{`${owned}/${count}`}</span>
                                                </span>
                                            </span>
                                            {!sideBySide && <HandheldCollectiblesChevron />}
                                        </ToggleButton>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}
                {showDetail && (
                    <section className="octane-handheld-collectibles__pane is-detail">{renderDetail(sideBySide ? null : () => setOpened(false))}</section>
                )}
            </div>
        </NativeTextTree>
    );
};

export interface HandheldCollectiblesCollectionViewProps {
    collection: CollectibleCollectionData;
    title: string;
    owned: number;
    total: number;
    complete: boolean;
    preview: CollectionPreview;
    timer: { visible: boolean; expired: boolean; fraction: number; msLeft: number } | null;
    selectedItem: CollectibleProductData | null;
    onToggleItem: (item: CollectibleProductData) => void;
    onClaim: () => void;
    onBack: (() => void) | null;
}

/**
 * One set on a phone: its name and count, the picture of the chosen product or of the set's prize on the star, what
 * the product gives or the completion bonus with its time left, the set's XP, and the products as tiles (tap one to
 * see it, tap it again for the set). Claim sits in the bar at the foot while the prize can be claimed.
 */
export const HandheldCollectiblesCollectionView: FC<HandheldCollectiblesCollectionViewProps> = (props) => {
    const { collection, title, owned, total, complete, preview, timer, selectedItem, onToggleItem, onClaim, onBack } = props;
    const claimable = !selectedItem && preview.kind !== 'collection' && preview.claimable;

    return (
        <NativeTextTree>
            <div className="octane-handheld-collectibles__page is-set" data-testid="collectibles-collection">
                <div className="octane-handheld-collectibles__scroll">
                    {onBack && <HandheldCollectiblesBack onClick={onBack} />}
                    <div className="octane-handheld-collectibles__set-head">
                        <span className="octane-handheld-collectibles__title">{title}</span>
                        <span
                            className="octane-handheld-collectibles__pill"
                            style={{ '--collectibles-progress': toHexColor(collectionProgressColor(owned, total)) } as CSSProperties}
                        >
                            {`${owned}/${total}`}
                        </span>
                    </div>
                    <HandheldCollectiblesStage
                        name={
                            selectedItem
                                ? getCollectibleProductName(selectedItem)
                                : preview.kind !== 'collection'
                                  ? getCollectibleProductName(preview.product)
                                  : null
                        }
                    >
                        {selectedItem ? (
                            <CollectibleProductImageView product={selectedItem} />
                        ) : preview.kind === 'collection' ? (
                            <div className="octane-collectibles-collection-default" />
                        ) : (
                            <CollectibleProductImageView product={preview.product} />
                        )}
                    </HandheldCollectiblesStage>
                    {selectedItem && (
                        <div className="octane-handheld-collectibles__card" data-testid="collectibles-item-detail">
                            <HandheldCollectiblesFacts product={selectedItem} />
                            <span
                                className="octane-handheld-collectibles__text"
                                dangerouslySetInnerHTML={html(
                                    selectedItem.amount > 0 ? 'collectibles.preview.product.complete' : 'collectibles.preview.product.incomplete',
                                    selectedItem.amount > 0 ? 'You earned <b>%amount%</b> XP with this item!' : 'Collect this item to get <b>%amount%</b> XP',
                                    ['amount'],
                                    [String(selectedItem.score)]
                                )}
                            />
                        </div>
                    )}
                    {!selectedItem && preview.kind !== 'collection' && (
                        <div className="octane-handheld-collectibles__card is-bonus" data-testid="collectibles-completion">
                            <span className="octane-handheld-collectibles__card-label">
                                {localizeWithFallback('collectibles.preview.completion_bonus', 'Completion bonus:')}
                            </span>
                            <strong className="octane-handheld-collectibles__card-name">{getCollectibleProductName(preview.product)}</strong>
                            {timer?.visible && (
                                <div className="octane-handheld-collectibles__timer" data-expired={timer.expired}>
                                    <span>
                                        {timer.expired
                                            ? localizeWithFallback(
                                                  'collectibles.preview.bonus_claim_ended',
                                                  'Bonus item claim period ended - %date%',
                                                  ['date'],
                                                  [formatCollectibleDate(collection.bonusEnd)]
                                              )
                                            : `${localizeWithFallback('collectibles.preview.time_left', 'Claim this item')}: ${FriendlyTime.format(timer.msLeft / 1000)}`}
                                    </span>
                                    <HandheldCollectiblesBar ratio={timer.fraction} />
                                </div>
                            )}
                        </div>
                    )}
                    {!selectedItem && (
                        <div className="octane-handheld-collectibles__card">
                            <span
                                className="octane-handheld-collectibles__text"
                                dangerouslySetInnerHTML={html(
                                    'collectibles.preview.score',
                                    'My current XP for this set: <b>%progress% / %goal%</b>',
                                    ['progress', 'goal'],
                                    [String(collection.score), String(collection.goal)]
                                )}
                            />
                            <HandheldCollectiblesBar ratio={collection.goal > 0 ? collection.score / collection.goal : 0} />
                            <span
                                className="octane-handheld-collectibles__text is-muted"
                                dangerouslySetInnerHTML={html(
                                    complete ? 'collectibles.preview.reward_collected' : 'collectibles.preview.reward',
                                    complete
                                        ? 'You get an extra <b>%amount%</b> XP boost for this complete set!'
                                        : 'Complete the set for an extra <b>%amount%</b> XP',
                                    ['amount'],
                                    [String(collection.completionXp)]
                                )}
                            />
                        </div>
                    )}
                    <div className="octane-handheld-collectibles__heading">
                        {localizeWithFallback('octane.handheld.collectibles.items', 'Items in this set')}
                    </div>
                    <div className="octane-handheld-collectibles__tiles">
                        {collection.items.map((item) => (
                            <ToggleButton
                                key={item.productCode}
                                aria-label={getCollectibleProductName(item)}
                                className="octane-handheld-collectibles__tile"
                                data-owned={item.amount > 0}
                                data-testid={`collectibles-item-${item.productCode}`}
                                pressed={selectedItem?.productCode === item.productCode}
                                onClick={() => onToggleItem(item)}
                            >
                                <span className="octane-handheld-collectibles__tile-image">
                                    <CollectibleProductImageView icon product={item} />
                                </span>
                                <span className="octane-handheld-collectibles__badge">{`x${item.amount}`}</span>
                                {item.amount > 0 && <img alt="" className="octane-handheld-collectibles__check" draggable={false} src={checkmarkIcon} />}
                            </ToggleButton>
                        ))}
                    </div>
                </div>
                {claimable && (
                    <HandheldCollectiblesActions>
                        <BaseButton className="octane-handheld-collectibles__button is-primary" data-testid="collectibles-claim" onClick={onClaim}>
                            {localizeWithFallback('collectibles.claim', 'Claim reward')}
                        </BaseButton>
                    </HandheldCollectiblesActions>
                )}
            </div>
        </NativeTextTree>
    );
};
