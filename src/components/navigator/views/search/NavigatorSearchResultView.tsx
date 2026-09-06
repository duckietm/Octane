import { NavigatorSearchResultList, NavigatorSearchSaveComposer } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText, localizeWithFallback, NavigatorSearchResultViewDisplayMode, SendMessageComposer } from '../../../../api';
import categoryCollapse from '../../../../assets/images/navigator/air/category-collapse.png';
import categoryExpand from '../../../../assets/images/navigator/air/category-expand.png';
import categoryShowMore from '../../../../assets/images/navigator/air/category-show-more.png';
import navViewMini from '../../../../assets/images/navigator/air/nav-view-mini.png';
import navViewRow from '../../../../assets/images/navigator/air/nav-view-row.png';
import navViewThumbs from '../../../../assets/images/navigator/air/nav-view-thumbs.png';
import { LayoutSearchSavesView } from '../../../../common';
import { useNavigatorData, useNavigatorUiStore } from '../../../../hooks';
import { NavigatorSearchResultItemView } from './NavigatorSearchResultItemView';

export interface NavigatorSearchResultViewProps {
    searchResult: NavigatorSearchResultList;
    parentCode?: string;
    parentFilter?: string;
    forceOpen?: boolean;
}

const isEventView = (code: string) => code === 'roomads_view' || code === 'new_ads' || code.startsWith('eventcategory__');

export const NavigatorSearchResultView: FC<NavigatorSearchResultViewProps> = (props) => {
    const { searchResult = null, parentCode = '', parentFilter = '', forceOpen = false } = props;
    const { topLevelContext } = useNavigatorData();
    const isExtended = useNavigatorUiStore((state) => {
        if (forceOpen && !state.collapsedResultCodes.includes(searchResult.code)) return true;

        return state.expandedResultCodes.includes(searchResult.code) || (!state.collapsedResultCodes.includes(searchResult.code) && !searchResult.closed);
    });
    const displayMode = useNavigatorUiStore((state) => state.resultViewModes[searchResult.code] ?? searchResult.mode);

    const getResultTitle = () => {
        const name = searchResult.code;

        if (!name || !name.length) return searchResult.data;
        if (name.startsWith('${')) return name.slice(2, name.length - 1);

        return localizeWithFallback('navigator.searchcode.title.' + name, searchResult.data || name);
    };

    const toggleDisplayMode = () => {
        const nextMode =
            displayMode === NavigatorSearchResultViewDisplayMode.LIST
                ? NavigatorSearchResultViewDisplayMode.THUMBNAILS
                : NavigatorSearchResultViewDisplayMode.LIST;

        useNavigatorUiStore.getState().setResultViewMode(searchResult.code, nextMode);
    };

    const showMore = () => {
        if (searchResult.action == 1) {
            useNavigatorUiStore.getState().setSearch(searchResult.code, parentFilter);
            return;
        }
        if (searchResult.action == 2 && topLevelContext) useNavigatorUiStore.getState().setSearch(topLevelContext.code, '');
    };

    const isTileMode = displayMode >= NavigatorSearchResultViewDisplayMode.THUMBNAILS;
    const resultTitle = getResultTitle();
    const listViewLabel = localizeWithFallback('navigator.viewmode.list', 'Show rooms as a list');
    const tileViewLabel = localizeWithFallback('navigator.viewmode.tiles', 'Show rooms as tiles');
    const hideSave = parentCode === 'official_view' || searchResult.code === 'official_view';
    const eventTitle = isEventView(searchResult.code) || isEventView(parentCode);

    return (
        <section className="octane-navigator-air__category">
            <header className="octane-navigator-air__category-header">
                <button
                    type="button"
                    className="octane-navigator-air__category-toggle"
                    aria-label={resultTitle}
                    aria-expanded={isExtended}
                    onClick={() => useNavigatorUiStore.getState().setResultCollapsed(searchResult.code, isExtended)}
                >
                    <img src={isExtended ? categoryCollapse : categoryExpand} alt="" />
                    <span>{resultTitle}</span>
                </button>
                <div className="octane-navigator-air__category-controls">
                    {displayMode === NavigatorSearchResultViewDisplayMode.LIST && (
                        <button
                            type="button"
                            className="octane-navigator-air__icon-button"
                            aria-label={tileViewLabel}
                            title={tileViewLabel}
                            onClick={toggleDisplayMode}
                        >
                            <img src={navViewThumbs} alt="" />
                        </button>
                    )}
                    {isTileMode && (
                        <button
                            type="button"
                            className="octane-navigator-air__icon-button"
                            aria-label={listViewLabel}
                            title={listViewLabel}
                            onClick={toggleDisplayMode}
                        >
                            <img src={navViewRow} alt="" />
                        </button>
                    )}
                    {searchResult.action > 0 && searchResult.action === 1 && (
                        <button type="button" className="octane-navigator-air__icon-button" title={LocalizeText('navigator.more.rooms')} onClick={showMore}>
                            <img src={categoryShowMore} alt="" />
                        </button>
                    )}
                    {searchResult.action > 0 && searchResult.action !== 1 && (
                        <button type="button" className="octane-navigator-air__icon-button" title={LocalizeText('navigator.back')} onClick={showMore}>
                            <img src={navViewMini} alt="" />
                        </button>
                    )}
                    {!hideSave && (
                        <LayoutSearchSavesView
                            title={LocalizeText('navigator.tooltip.add.saved.search')}
                            onClick={() => SendMessageComposer(new NavigatorSearchSaveComposer(searchResult.code, parentFilter))}
                        />
                    )}
                </div>
            </header>
            {isExtended && (
                <div className={isTileMode ? 'octane-navigator-air__tiles' : 'octane-navigator-air__rows'}>
                    {searchResult.rooms.map((room, index) => (
                        <NavigatorSearchResultItemView
                            key={room.roomId || index}
                            roomData={room}
                            thumbnail={isTileMode}
                            eventTitle={eventTitle}
                            stripe={isTileMode ? Math.floor(index / 3) % 2 === 1 : index % 2 === 1}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};
