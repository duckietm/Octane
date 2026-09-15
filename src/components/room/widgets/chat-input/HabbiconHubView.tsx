import { FC, MouseEvent, useEffect, useRef, useState } from 'react';
import { HabbiconEntry, localizeHabbiconName, localizeWithFallback, useHabbiconCatalog } from '../../../../api';
import { HabbiconFavorite, HabbiconHeaderPattern, HabbiconsLogo } from '../../../../assets/images/habbicons';
import { DraggableWindowPosition, LayoutCurrencyIcon, LayoutHabbiconImageView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { HabbiconProgressBarView } from './HabbiconProgressBarView';
import { HabbiconPurchaseView } from './HabbiconPurchaseView';

export const HabbiconPrice: FC<{ priceCredits: number; priceActivityPoints: number; activityPointType: number }> = ({
    priceCredits,
    priceActivityPoints,
    activityPointType
}) => (
    <span className="habbicon-price">
        {priceCredits > 0 && (
            <>
                {priceCredits}
                <LayoutCurrencyIcon type={-1} />
            </>
        )}
        {priceCredits > 0 && priceActivityPoints > 0 && ' + '}
        {priceActivityPoints > 0 && (
            <>
                {priceActivityPoints}
                <LayoutCurrencyIcon type={activityPointType} />
            </>
        )}
    </span>
);

export const HabbiconHubView: FC = () => {
    const catalog = useHabbiconCatalog();
    const [tab, setTab] = useState('all_sets');
    const [activeSetId, setActiveSetId] = useState('');
    const [popup, setPopup] = useState<{ id: number; x: number; y: number } | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const { sets, entries, ownedEntries, ownedSets } = catalog;
    const activeSet = sets.find((set) => set.id === activeSetId) || sets[0];
    const popupEntry = entries.find((entry) => entry.id === popup?.id);
    const completedSets = sets.filter((set) => set.total > 0 && set.completed >= set.total).length;
    const collected = sets.reduce((total, set) => total + set.completed + Number(set.reward?.owned || false), 0);
    const total = sets.reduce((total, set) => total + set.total + Number(!!set.reward), 0);
    const favoriteEntries = ownedEntries.filter((entry) => entry.favorite);

    useEffect(() => {
        if (!catalog.bookVisible) return;

        catalog.clearUnseen();
        catalog.refresh();
        const closePopup = (event: globalThis.MouseEvent) => {
            if (!popupRef.current?.contains(event.target as Node)) setPopup(null);
        };
        document.addEventListener('mousedown', closePopup);
        return () => document.removeEventListener('mousedown', closePopup);
    }, [catalog.bookVisible]);

    if (!catalog.enabled || !catalog.bookVisible) return null;

    const showPopup = (event: MouseEvent, entry: HabbiconEntry) => {
        const tile = event.currentTarget.getBoundingClientRect();
        const body = bodyRef.current.getBoundingClientRect();
        setPopup((current) =>
            current?.id === entry.id
                ? null
                : {
                      id: entry.id,
                      x: bodyRef.current.scrollLeft + Math.max(4, Math.min(body.width - 184, tile.left - body.left - 65)),
                      y: bodyRef.current.scrollTop + tile.top - body.top + 2
                  }
        );
        if (!entry.owned && !entry.claimable && !entry.isReward) catalog.getInfo(entry.id);
    };

    const renderTile = (entry: HabbiconEntry) => (
        <button
            className={`habbicon-tile air-bitmap-surface ${entry.owned ? 'owned' : 'unowned'} ${entry.claimable ? 'claimable' : ''} ${popup?.id === entry.id ? 'active' : ''}`}
            key={entry.id}
            type="button"
            title={localizeHabbiconName(entry)}
            onClick={(event) => showPopup(event, entry)}
        >
            <LayoutHabbiconImageView id={entry.id} className="habbicon-tile-image" />
            {entry.favorite && <img alt="" className="habbicon-hub-fav" src={HabbiconFavorite} />}
            {entry.claimable && <span className="habbicon-claimable-marker" />}
        </button>
    );

    return (
        <>
            <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
                <filter id="habbicon-unowned-filter" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values=".35 0 0 0 .35294 0 .35 0 0 .33333 0 0 .35 0 .31373 0 0 0 .65 0" />
                </filter>
            </svg>
            <OctaneCardView
                classNames={['habbicon-hub-window']}
                frameStyle={3}
                isResizable={false}
                uniqueKey="habbicon-hub"
                windowPosition={DraggableWindowPosition.CENTER}
            >
                <OctaneCardHeaderView
                    headerText={localizeWithFallback('habbicon_book.title', 'Habbicons Collection')}
                    onCloseClick={() => {
                        catalog.setBookVisible(false);
                        setPopup(null);
                    }}
                />
                <div className="habbicon-hub-body air-bitmap-surface" ref={bodyRef} onScrollCapture={() => setPopup(null)}>
                    <div className="habbicon-hub-header">
                        <div className="habbicon-hub-header-surface air-bitmap-surface">
                            <div className="habbicon-hub-header-pattern" style={{ backgroundImage: `url(${HabbiconHeaderPattern})` }} />
                            <img alt="" className="habbicon-hub-logo" src={HabbiconsLogo} />
                            <div className="habbicon-hub-header-copy">
                                <strong>{localizeWithFallback('habbicons.hud.title', 'Habbicons')}</strong>
                                <span>
                                    {localizeWithFallback('habbicon_book.subtitle', 'Collect sets, unlock animated Habbicons, and use them inside rooms!')}
                                </span>
                            </div>
                            <div className="habbicon-hub-stat owned air-bitmap-surface">
                                <span>{localizeWithFallback('habbicons.owned.description', 'Owned habbicons')}</span>
                                <strong>{ownedEntries.length}</strong>
                            </div>
                            <div className="habbicon-hub-stat completed air-bitmap-surface">
                                <span>{localizeWithFallback('habbicon_book.sets_completed', 'Sets completed')}</span>
                                <strong>{completedSets}</strong>
                            </div>
                            <div className="habbicon-hub-progress">
                                <HabbiconProgressBarView completed={collected} total={total} variant="album" />
                                <strong>
                                    {collected} / {total}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="habbicon-hub-tabs" role="tablist">
                        {['all_sets', 'owned', 'favourited'].map((value, index) => (
                            <button
                                role="tab"
                                aria-selected={tab === value}
                                className={tab === value ? 'active' : ''}
                                type="button"
                                key={value}
                                onClick={() => {
                                    setTab(value);
                                    setPopup(null);
                                }}
                            >
                                {localizeWithFallback(`habbicon_book.tab.${value}`, ['All sets', 'Owned', 'Favourited'][index])}
                            </button>
                        ))}
                    </div>

                    {(!catalog.loaded || catalog.assetError) && (
                        <div className="habbicon-hub-empty" role="status">
                            {catalog.assetError
                                ? localizeWithFallback('habbicons.assets.failed', 'Habicon images could not be loaded.')
                                : catalog.error || localizeWithFallback('generic.loading', 'Loading…')}
                        </div>
                    )}

                    {!catalog.loaded && catalog.error && (
                        <button type="button" className="habbicon-action habbicon-hub-retry" onClick={catalog.retry}>
                            {localizeWithFallback('generic.retry', 'Try again')}
                        </button>
                    )}

                    {catalog.loaded && tab === 'all_sets' && (
                        <div className="habbicon-hub-all-sets">
                            <div className="habbicon-hub-rail air-bitmap-surface">
                                <div className="habbicon-hub-rail-list has-classic-scrollbar">
                                    {sets.map((set) => (
                                        <button
                                            className={`air-bitmap-surface ${set.id === activeSet?.id ? 'active' : ''}`}
                                            key={set.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveSetId(set.id);
                                                setPopup(null);
                                            }}
                                        >
                                            {set.entries[0] && <LayoutHabbiconImageView id={set.entries[0].id} />}
                                            <div>
                                                <strong>{set.title}</strong>
                                                <HabbiconProgressBarView completed={set.completed} total={set.total} variant="rail" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {activeSet && (
                                <div className="habbicon-hub-page">
                                    <div className="habbicon-hub-page-background air-bitmap-surface" />
                                    <div className="habbicon-hub-page-header air-bitmap-surface">
                                        <h3>{activeSet.title}</h3>
                                        <p>{activeSet.description}</p>
                                        <div className="habbicon-hub-set-progress">
                                            <HabbiconProgressBarView key={activeSet.id} completed={activeSet.completed} total={activeSet.total} variant="set" />
                                            <strong>
                                                {activeSet.completed} / {activeSet.total}
                                            </strong>
                                        </div>
                                    </div>
                                    <div className="habbicon-hub-grid has-classic-scrollbar">
                                        {activeSet.entries.map(renderTile)}
                                        {Array.from({ length: Math.max(0, 20 - activeSet.entries.length) }, (_, index) => (
                                            <div className="habbicon-empty-tile air-bitmap-surface" key={`empty-${index}`} />
                                        ))}
                                    </div>
                                    {activeSet.reward && (
                                        <div className="habbicon-hub-reward air-bitmap-surface">
                                            <strong>{localizeWithFallback('habbicon_book.reward.title', 'Set reward')}</strong>
                                            <div className="habbicon-hub-reward-image air-bitmap-surface">
                                                <LayoutHabbiconImageView id={activeSet.reward.id} />
                                            </div>
                                            <p>
                                                {localizeWithFallback(
                                                    `habbicon_book.reward.${activeSet.reward.owned ? 'claimed' : activeSet.reward.claimable ? 'claimable' : 'locked'}`,
                                                    activeSet.reward.owned
                                                        ? 'Reward claimed.'
                                                        : activeSet.reward.claimable
                                                          ? 'Reward ready to claim.'
                                                          : 'Complete this set to unlock the reward.'
                                                )}
                                            </p>
                                            <button
                                                className="habbicon-action"
                                                type="button"
                                                disabled={!activeSet.reward.claimable || !!catalog.pending}
                                                onClick={() => catalog.claim(activeSet.reward.id)}
                                            >
                                                {localizeWithFallback(
                                                    activeSet.reward.owned ? 'habbicon_reward.claimed' : 'habbicon_reward.claim',
                                                    activeSet.reward.owned ? 'Claimed' : 'Claim'
                                                )}
                                            </button>
                                            {activeSet.canBuy && !activeSet.reward.owned && !activeSet.reward.claimable && (
                                                <div className="habbicon-hub-buy-set air-bitmap-surface">
                                                    <strong>{localizeWithFallback('habbicon_book.buy_set', 'Buy set')}</strong>
                                                    <div className="habbicon-hub-buy-row">
                                                        <HabbiconPrice {...activeSet} />
                                                        <button
                                                            className="habbicon-action"
                                                            type="button"
                                                            disabled={!!catalog.pending}
                                                            onClick={() => catalog.setPurchase({ id: activeSet.collectionId, collection: true })}
                                                        >
                                                            {localizeWithFallback('generic.buy', 'Buy')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {catalog.loaded && tab !== 'all_sets' && (
                        <div className="habbicon-hub-tray air-bitmap-surface">
                            <h3>{localizeWithFallback(`habbicon_book.tab.${tab}`, tab === 'owned' ? 'Owned' : 'Favourited')}</h3>
                            <p>{localizeWithFallback('habbicon_book.tray.summary', 'Habicons you own, grouped by set.')}</p>
                            <div className="habbicon-hub-tray-groups has-classic-scrollbar">
                                {(tab === 'owned'
                                    ? ownedSets
                                    : [{ id: 'favourites', title: localizeWithFallback('habbicons.favourites.title', 'Favourites'), entries: favoriteEntries }]
                                ).map(
                                    (set) =>
                                        set.entries.length > 0 && (
                                            <section className="air-bitmap-surface" key={set.id}>
                                                <strong>{set.title}</strong>
                                                <div className="habbicon-hub-tray-grid">{set.entries.map(renderTile)}</div>
                                            </section>
                                        )
                                )}
                                {(tab === 'owned' ? ownedEntries : favoriteEntries).length === 0 && (
                                    <p>{localizeWithFallback('habbicons.no_habbicons', 'No Habicons')}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {popupEntry && (
                        <div
                            className="habbicon-hub-popup air-bitmap-surface"
                            role="dialog"
                            ref={popupRef}
                            style={{ left: popup.x, top: Math.max(102, popup.y - (popupEntry.owned || popupEntry.claimable ? 68 : 104)) }}
                        >
                            <strong>{localizeHabbiconName(popupEntry)}</strong>
                            {popupEntry.owned ? (
                                <button
                                    className={`habbicon-action ${popupEntry.favorite ? 'remove' : ''}`}
                                    type="button"
                                    disabled={!!catalog.pending}
                                    onClick={() => catalog.toggleFavorite(popupEntry.id)}
                                >
                                    {localizeWithFallback(
                                        popupEntry.favorite ? 'habbicon.favourite.remove' : 'habbicon.favourite.add',
                                        popupEntry.favorite ? 'Remove from favourites' : 'Add to favourites'
                                    )}
                                </button>
                            ) : popupEntry.claimable ? (
                                <button className="habbicon-action" type="button" disabled={!!catalog.pending} onClick={() => catalog.claim(popupEntry.id)}>
                                    {localizeWithFallback('habbicon_reward.claim', 'Claim')}
                                </button>
                            ) : (
                                <>
                                    <p>
                                        {localizeWithFallback(
                                            popupEntry.isReward ? 'habbicon.popup.desc.locked' : 'habbicon.popup.desc.not_owned',
                                            popupEntry.isReward ? 'Locked' : 'Not owned'
                                        )}
                                    </p>
                                    {popupEntry.purchasable && (
                                        <div className="habbicon-popup-purchase">
                                            <HabbiconPrice {...popupEntry} />
                                            <button
                                                className="habbicon-action"
                                                type="button"
                                                disabled={!!catalog.pending}
                                                onClick={() => catalog.setPurchase({ id: popupEntry.id, collection: false })}
                                            >
                                                {localizeWithFallback('generic.buy', 'Buy')}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    {catalog.error && !catalog.purchase && (
                        <div className="habbicon-error" role="alert">
                            {catalog.error}
                        </div>
                    )}
                </div>
            </OctaneCardView>
            {catalog.purchase && <HabbiconPurchaseView />}
        </>
    );
};
