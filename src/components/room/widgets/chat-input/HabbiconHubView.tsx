import { FC, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { HabbiconEntry, HabbiconSet, localizeHabbiconName, localizeWithFallback } from '../../../../api';
import { HabbiconFavorite, HabbiconHeaderPattern, HabbiconsLogo } from '../../../../assets/images/habbicons';
import { DraggableWindowPosition, OctaneCardHeaderView, OctaneCardView } from '../../../../common';

type HabbiconHubViewProps = {
    baseUrl: string;
    sets: HabbiconSet[];
    favoriteIds: number[];
    onClose: () => void;
    onToggleFavorite: (habbiconId: number) => void;
};

type TabMode = 'all_sets' | 'owned' | 'favourited';

const spriteStyle = (entry: HabbiconEntry, baseUrl: string) => ({
    width: Math.min(40, entry.width),
    height: Math.min(40, entry.height),
    backgroundImage: `url(${baseUrl}habbicons_spritesheet.png)`,
    backgroundPosition: `-${entry.x}px -${entry.y}px`
});

export const HabbiconHubView: FC<HabbiconHubViewProps> = ({ baseUrl, sets, favoriteIds, onClose, onToggleFavorite }) => {
    const [tab, setTab] = useState<TabMode>('all_sets');
    const [activeSetId, setActiveSetId] = useState(sets[0]?.id || '');
    const [popupId, setPopupId] = useState(0);
    const popupRef = useRef<HTMLDivElement>(null);
    const ownedCount = sets.reduce((total, set) => total + set.entries.length, 0);
    const completedSets = sets.filter((set) => set.entries.length > 0).length;
    const activeSet = sets.find((set) => set.id === activeSetId) || sets[0];
    const favoriteEntries = useMemo(() => {
        const byId = new Map(sets.flatMap((set) => set.entries).map((entry) => [entry.id, entry]));

        return favoriteIds.map((id) => byId.get(id)).filter(Boolean) as HabbiconEntry[];
    }, [favoriteIds, sets]);

    useEffect(() => {
        if (!sets.some((set) => set.id === activeSetId) && sets[0]) setActiveSetId(sets[0].id);
    }, [activeSetId, sets]);

    useEffect(() => {
        const onDocumentDown = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) setPopupId(0);
        };

        document.addEventListener('mousedown', onDocumentDown);

        return () => document.removeEventListener('mousedown', onDocumentDown);
    }, []);

    const onTileClick = (event: ReactMouseEvent, habbiconId: number) => {
        event.stopPropagation();
        setPopupId((current) => (current === habbiconId ? 0 : habbiconId));
    };

    const popupEntry = popupId ? activeSet?.entries.find((entry) => entry.id === popupId) || favoriteEntries.find((entry) => entry.id === popupId) : null;
    const popupFavorite = popupEntry ? favoriteIds.includes(popupEntry.id) : false;

    return (
        <OctaneCardView classNames={['habbicon-hub-window']} isResizable={false} uniqueKey="habbicon-hub" windowPosition={DraggableWindowPosition.CENTER}>
            <OctaneCardHeaderView headerText={localizeWithFallback('habbicon_book.title', 'Habbicon Book')} onCloseClick={onClose} />
            <div className="habbicon-hub-body">
                <div className="habbicon-hub-header">
                    <img alt="" className="habbicon-hub-header-pattern" src={HabbiconHeaderPattern} />
                    <img alt="" className="habbicon-hub-logo" src={HabbiconsLogo} />
                    <div className="habbicon-hub-header-copy">
                        <strong>{localizeWithFallback('habbicons.hud.title', 'Habicons')}</strong>
                        <span>{localizeWithFallback('habbicon_book.subtitle', 'Collect Habicons and complete sets.')}</span>
                    </div>
                    <div className="habbicon-hub-stat owned">
                        <span>{localizeWithFallback('habbicons.owned.description', 'Owned')}</span>
                        <strong>{ownedCount}</strong>
                    </div>
                    <div className="habbicon-hub-stat completed">
                        <span>{localizeWithFallback('habbicon_book.sets_completed', 'Sets completed')}</span>
                        <strong>{completedSets}</strong>
                    </div>
                    <div className="habbicon-hub-progress">
                        <div className="habbicon-hub-progress-bar">
                            <div className="habbicon-hub-progress-fill" style={{ width: ownedCount ? '100%' : '0%' }} />
                        </div>
                        <strong>
                            {ownedCount} / {ownedCount}
                        </strong>
                    </div>
                </div>
                <div className="habbicon-hub-tabs">
                    <button className={tab === 'all_sets' ? 'active' : ''} type="button" onClick={() => setTab('all_sets')}>
                        {localizeWithFallback('habbicon_book.tab.all_sets', 'All sets')}
                    </button>
                    <button className={tab === 'owned' ? 'active' : ''} type="button" onClick={() => setTab('owned')}>
                        {localizeWithFallback('habbicon_book.tab.owned', 'Owned')}
                    </button>
                    <button className={tab === 'favourited' ? 'active' : ''} type="button" onClick={() => setTab('favourited')}>
                        {localizeWithFallback('habbicon_book.tab.favourited', 'Favourited')}
                    </button>
                </div>
                {tab === 'all_sets' && (
                    <div className="habbicon-hub-all-sets">
                        <div className="habbicon-hub-rail has-classic-scrollbar">
                            {sets.map((set) => {
                                const icon = set.entries[0];

                                return (
                                    <button
                                        className={set.id === activeSet?.id ? 'active' : ''}
                                        key={set.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveSetId(set.id);
                                            setPopupId(0);
                                        }}
                                    >
                                        {icon && <span style={spriteStyle(icon, baseUrl)} />}
                                        <div>
                                            <strong>{set.title}</strong>
                                            <div className="habbicon-hub-rail-progress">
                                                <div style={{ width: '100%' }} />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {activeSet && (
                            <div className="habbicon-hub-page">
                                <div className="habbicon-hub-page-header">
                                    <h3>{activeSet.title}</h3>
                                    {activeSet.description && <p>{activeSet.description}</p>}
                                    <div className="habbicon-hub-set-progress">
                                        <div className="habbicon-hub-set-progress-bar">
                                            <div style={{ width: '100%' }} />
                                        </div>
                                        <strong>
                                            {activeSet.entries.length} / {activeSet.entries.length}
                                        </strong>
                                    </div>
                                </div>
                                <div className="habbicon-hub-grid has-classic-scrollbar">
                                    {activeSet.entries.map((entry) => (
                                        <button
                                            className={popupId === entry.id ? 'active' : ''}
                                            key={entry.id}
                                            type="button"
                                            onClick={(event) => onTileClick(event, entry.id)}
                                        >
                                            <span style={spriteStyle(entry, baseUrl)} />
                                            {favoriteIds.includes(entry.id) && <img alt="" className="habbicon-hub-fav" src={HabbiconFavorite} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {tab !== 'all_sets' && (
                    <div className="habbicon-hub-tray has-classic-scrollbar">
                        <h3>
                            {localizeWithFallback(
                                tab === 'owned' ? 'habbicon_book.tab.owned' : 'habbicon_book.tab.favourited',
                                tab === 'owned' ? 'Owned' : 'Favourited'
                            )}
                        </h3>
                        <p>{localizeWithFallback('habbicon_book.tray.summary', 'Habicons you own, grouped by set.')}</p>
                        {(tab === 'owned'
                            ? sets
                            : [
                                  {
                                      id: 'favourited',
                                      title: localizeWithFallback('habbicon_book.tab.favourited', 'Favourited'),
                                      description: '',
                                      entries: favoriteEntries
                                  }
                              ]
                        ).map(
                            (set) =>
                                set.entries.length > 0 && (
                                    <section key={set.id}>
                                        <strong>{set.title}</strong>
                                        <div className="habbicon-hub-tray-grid">
                                            {set.entries.map((entry) => (
                                                <button
                                                    className={popupId === entry.id ? 'active' : ''}
                                                    key={entry.id}
                                                    type="button"
                                                    onClick={(event) => onTileClick(event, entry.id)}
                                                >
                                                    <span style={spriteStyle(entry, baseUrl)} />
                                                    {favoriteIds.includes(entry.id) && <img alt="" className="habbicon-hub-fav" src={HabbiconFavorite} />}
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )
                        )}
                    </div>
                )}
                {popupEntry && (
                    <div className="habbicon-hub-popup" ref={popupRef}>
                        <strong>{localizeHabbiconName(popupEntry)}</strong>
                        <button className={popupFavorite ? 'remove' : 'add'} type="button" onClick={() => onToggleFavorite(popupEntry.id)}>
                            {popupFavorite
                                ? localizeWithFallback('habbicon.favourite.remove', 'Remove from favourites')
                                : localizeWithFallback('habbicon.favourite.add', 'Add to favourites')}
                        </button>
                    </div>
                )}
            </div>
        </OctaneCardView>
    );
};
