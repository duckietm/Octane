import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { HABBICON_GRID_COLUMNS, HabbiconEntry, localizeHabbiconName, localizeWithFallback, padHabbiconRow, useHabbiconCatalog } from '../../../../api';
import { LayoutHabbiconImageView, LayoutItemCountView } from '../../../../common';

type PickerSection = {
    id: string;
    title: string;
    entries: HabbiconEntry[];
};

const TILE_HEIGHT = 45;
const TILE_GAP = 2;
const TOP_BAR_HEIGHT = 42;
const BOTTOM_PADDING = 6;
const MENU_MIN_HEIGHT = 94;
const LIST_MIN_HEIGHT = 46;
const LIST_MAX_HEIGHT = 256;
const SECTION_TITLE_HEIGHT = 20;
const SECTION_EXTRA = 2;
const SECTION_SPACING = 4;

const measurePickerHeight = (sections: PickerSection[]) => {
    if (!sections.length) return { windowHeight: 138, listHeight: 88 };

    let contentHeight = 0;

    for (const [index, section] of sections.entries()) {
        const rows = Math.max(1, Math.ceil(section.entries.length / HABBICON_GRID_COLUMNS));
        const gridHeight = rows * TILE_HEIGHT + (rows - 1) * TILE_GAP;

        contentHeight += SECTION_TITLE_HEIGHT + gridHeight + SECTION_EXTRA;

        if (index < sections.length - 1) contentHeight += SECTION_SPACING;
    }

    const listHeight = Math.min(LIST_MAX_HEIGHT, Math.max(LIST_MIN_HEIGHT, contentHeight + 2));

    return {
        listHeight,
        windowHeight: Math.max(MENU_MIN_HEIGHT, TOP_BAR_HEIGHT + listHeight + BOTTOM_PADDING)
    };
};

export const FriendsMessengerHabbiconPickerView: FC<{
    onClose: () => void;
    onOpenHub: () => void;
    onSelect: (id: number, keepOpen?: boolean) => void;
}> = ({ onClose, onOpenHub, onSelect }) => {
    const catalog = useHabbiconCatalog();
    const [search, setSearch] = useState('');
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!pickerRef.current?.contains(event.target as Node)) onClose();
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;

            if (search) {
                setSearch('');
                return;
            }

            onClose();
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [onClose, search]);

    const sections = useMemo<PickerSection[]>(() => {
        const query = search.trim().toLowerCase();

        if (query) {
            const matches = catalog.ownedEntries.filter(
                (entry) =>
                    localizeHabbiconName(entry).toLowerCase().includes(query) || entry.nameKey.toLowerCase().includes(query) || entry.id.toString() === query
            );

            return matches.length ? [{ id: 'search', title: localizeWithFallback('habbicon.search.results', 'Search results'), entries: matches }] : [];
        }

        const next: PickerSection[] = [];
        const byId = new Map(catalog.ownedEntries.map((entry) => [entry.id, entry]));
        const favorites = catalog.favoriteIds.map((id) => byId.get(id)).filter(Boolean) as HabbiconEntry[];
        const recent = catalog.recentIds.map((id) => byId.get(id)).filter(Boolean) as HabbiconEntry[];

        if (favorites.length) next.push({ id: 'favorites', title: localizeWithFallback('habbicons.favourites.title', 'Favorites'), entries: favorites });
        if (recent.length) next.push({ id: 'recent', title: localizeWithFallback('habbicon.recently.used', 'Recently used'), entries: recent });

        for (const set of catalog.ownedSets) {
            if (set.entries.length) next.push({ id: set.id, title: set.title, entries: set.entries });
        }

        return next;
    }, [catalog.ownedEntries, catalog.favoriteIds, catalog.recentIds, catalog.ownedSets, search]);

    const { listHeight, windowHeight } = useMemo(() => measurePickerHeight(sections), [sections]);

    const choose = (id: number, keepOpen = false) => {
        catalog.clearUnseen(id);
        onSelect(id, keepOpen);
    };

    return (
        <div ref={pickerRef} className="messenger-habbicon-picker" role="dialog" aria-label="Habbicons" style={{ height: windowHeight }}>
            <div className="messenger-habbicon-controls">
                <div className="messenger-habbicon-search">
                    <input autoFocus maxLength={24} value={search} onChange={(event) => setSearch(event.target.value)} />
                    {!search && <span>{localizeWithFallback('generic.search', 'Search')}</span>}
                    {search && <button aria-label="Clear" type="button" onClick={() => setSearch('')} />}
                </div>
                <button className="messenger-btn messenger-habbicon-get-more" type="button" onClick={onOpenHub}>
                    {localizeWithFallback('habbicons.hud.get_more', 'Get more')}
                </button>
            </div>
            {sections.length > 0 ? (
                <div className="messenger-habbicon-scroll has-classic-scrollbar" style={{ height: listHeight }}>
                    {sections.map((section) => (
                        <section key={section.id}>
                            <strong>{section.title}</strong>
                            <div className="messenger-habbicon-grid">
                                {padHabbiconRow(section.entries).map((entry, index) =>
                                    entry ? (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            title={localizeHabbiconName(entry)}
                                            onClick={(event) => choose(entry.id, event.shiftKey)}
                                        >
                                            <LayoutHabbiconImageView id={entry.id} size={40} />
                                            {catalog.isUnseen(entry.id) && <LayoutItemCountView count={1} style={{ top: -3, right: -3 }} />}
                                        </button>
                                    ) : (
                                        <div className="empty" key={`empty-${section.id}-${index}`} />
                                    )
                                )}
                            </div>
                        </section>
                    ))}
                </div>
            ) : (
                <div className="messenger-habbicon-empty">{localizeWithFallback('habbicons.no_habbicons', 'No Habicons')}</div>
            )}
        </div>
    );
};
