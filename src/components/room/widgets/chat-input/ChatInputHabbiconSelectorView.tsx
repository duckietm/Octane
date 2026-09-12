import { HabbiconAssetManager, UseHabbiconComposer } from '@octane/renderer';
import * as Popover from '@radix-ui/react-popover';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    HABBICON_CELL_SIZE,
    HABBICON_GRID_COLUMNS,
    HabbiconEntry,
    localizeHabbiconName,
    localizeWithFallback,
    padHabbiconRow,
    SendMessageComposer,
    useHabbiconCatalog
} from '../../../../api';
import { UseHabbiconIcon } from '../../../../assets/images/habbicons';
import { LayoutHabbiconImageView, LayoutItemCountView } from '../../../../common';

type SelectorSection = {
    id: string;
    title: string;
    entries: HabbiconEntry[];
};

const TOP_BAR_HEIGHT = 42;
const BOTTOM_PADDING = 6;
const MENU_MIN_HEIGHT = 91;
const LIST_MIN_HEIGHT = 46;
const LIST_MAX_HEIGHT = 244;
const SECTION_TITLE_HEIGHT = 20;
const SECTION_SPACING = 4;

const measureSelectorHeight = (sections: SelectorSection[]) => {
    if (!sections.length) return { windowHeight: 138, listHeight: 88 };

    let contentHeight = 0;

    for (const [index, section] of sections.entries()) {
        const rows = Math.max(1, Math.ceil(section.entries.length / HABBICON_GRID_COLUMNS));
        const gridHeight = rows * HABBICON_CELL_SIZE + (rows - 1) * 2;

        contentHeight += SECTION_TITLE_HEIGHT + gridHeight + 2;

        if (index < sections.length - 1) contentHeight += SECTION_SPACING;
    }

    const listHeight = Math.min(LIST_MAX_HEIGHT, Math.max(LIST_MIN_HEIGHT, contentHeight + 2));

    return {
        listHeight,
        windowHeight: Math.max(MENU_MIN_HEIGHT, TOP_BAR_HEIGHT + listHeight + BOTTOM_PADDING)
    };
};

export const ChatInputHabbiconSelectorView: FC = () => {
    const catalog = useHabbiconCatalog();
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [search, setSearch] = useState('');

    const sections = useMemo<SelectorSection[]>(() => {
        const query = search.trim().toLowerCase();

        if (query) {
            const matches = catalog.ownedEntries.filter(
                (entry) =>
                    localizeHabbiconName(entry).toLowerCase().includes(query) ||
                    entry.nameKey.toLowerCase().includes(query) ||
                    entry.id.toString().includes(query)
            );

            return matches.length ? [{ id: 'search', title: localizeWithFallback('habbicon.search.results', 'Search results'), entries: matches }] : [];
        }

        const next: SelectorSection[] = [];
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

    const { listHeight, windowHeight } = useMemo(() => measureSelectorHeight(sections), [sections]);

    useEffect(() => {
        if (!catalog.enabled || !catalog.baseUrl) return;

        void HabbiconAssetManager.getInstance().preload();
    }, [catalog.baseUrl, catalog.enabled]);

    if (!catalog.enabled || !catalog.baseUrl) return null;

    const applyHabbicon = async (habbiconId: number, keepOpen = false) => {
        await HabbiconAssetManager.getInstance().preload();
        catalog.clearUnseen(habbiconId);
        SendMessageComposer(new UseHabbiconComposer(habbiconId));

        if (!keepOpen) setSelectorVisible(false);
    };

    return (
        <Popover.Root
            open={selectorVisible}
            onOpenChange={(open) => {
                setSelectorVisible(open);
                if (!open) setSearch('');
            }}
        >
            <Popover.Trigger asChild>
                <button className="habbicon-chat-trigger" title={localizeWithFallback('habbicons.hud.title', 'Habicons')} type="button">
                    {catalog.lastUsedCollectionId ? (
                        <LayoutHabbiconImageView collection outlined id={catalog.lastUsedCollectionId} size={22} />
                    ) : (
                        <img alt="" src={UseHabbiconIcon} />
                    )}
                    {!selectorVisible && catalog.unseenCount > 0 && <span className="habbicon-unseen-count">{catalog.unseenCount}</span>}
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content align="start" avoidCollisions={false} className="habbicon-selector-popover" side="top" sideOffset={17}>
                    <div className="habbicon-selector-window" style={{ height: windowHeight }}>
                        <div className="habbicon-selector-controls">
                            <div className="habbicon-selector-search">
                                <input maxLength={24} value={search} onChange={(event) => setSearch(event.target.value)} />
                                {!search && <span>{localizeWithFallback('generic.search', 'Search')}</span>}
                                {search && <button aria-label="Clear" type="button" onClick={() => setSearch('')} />}
                            </div>
                            <button
                                className="habbicon-selector-book-button"
                                type="button"
                                onClick={() => {
                                    catalog.setBookVisible(true);
                                    setSelectorVisible(false);
                                }}
                            >
                                {localizeWithFallback('habbicons.hud.get_more', 'Get more')}
                            </button>
                        </div>
                        {sections.length > 0 ? (
                            <div className="habbicon-selector-sections has-classic-scrollbar" style={{ height: listHeight }}>
                                {sections.map((section) => (
                                    <section className="habbicon-selector-section" key={section.id}>
                                        <div className="habbicon-selector-section-title">{section.title}</div>
                                        <div className="habbicon-selector-grid">
                                            {padHabbiconRow(section.entries).map((entry, index) =>
                                                entry ? (
                                                    <button
                                                        className="habbicon-selector-item filled"
                                                        key={entry.id}
                                                        title={localizeHabbiconName(entry)}
                                                        type="button"
                                                        onClick={(event) => void applyHabbicon(entry.id, event.shiftKey)}
                                                    >
                                                        <LayoutHabbiconImageView id={entry.id} size={30} />
                                                        {catalog.isUnseen(entry.id) && <LayoutItemCountView count={1} style={{ top: -5, right: -5 }} />}
                                                    </button>
                                                ) : (
                                                    <div className="habbicon-selector-item empty" key={`empty-${section.id}-${index}`} />
                                                )
                                            )}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <div className="habbicon-selector-empty">{localizeWithFallback('habbicons.no_habbicons', 'No Habicons')}</div>
                        )}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
