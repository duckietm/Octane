import { NavigatorSearchResultSet, NavigatorTopLevelContext } from '@octane/renderer';
import { FC, RefObject } from 'react';
import { CreateLinkEvent, INavigatorLiftedRoom, LocalizeText, localizeWithFallback, NAVIGATOR_LIFTED_VIEW_CODE } from '../../../api';
import { WidgetErrorBoundary } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { TabBar, TabBarTab } from '../../../common/TabBar';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useNavigatorRoomInfoPopupStore, useNavigatorUiStore } from '../../../hooks';
import { NavigatorRoomCreatorView } from './NavigatorRoomCreatorView';
import { NavigatorEmptyStateView } from './search/NavigatorEmptyStateView';
import { NavigatorLiftedRoomsView } from './search/NavigatorLiftedRoomsView';
import { NavigatorSearchResultView } from './search/NavigatorSearchResultView';
import { NavigatorSearchView } from './search/NavigatorSearchView';

export interface HandheldNavigatorViewProps {
    title: string;
    tabs: NavigatorTopLevelContext[] | null;
    /** The code of the tab on screen, or null while the room creator is open. */
    activeTabCode: string | null;
    searchResult: NavigatorSearchResultSet | null;
    liftedRooms: INavigatorLiftedRoom[];
    isFetching: boolean;
    isCreatorOpen: boolean;
    /** The second large button promotes the room instead of leading somewhere new. */
    showPromote: boolean;
    resultsRef: RefObject<HTMLDivElement | null>;
    onCreateRoom: () => void;
    onRandomRoom: () => void;
    onPromoteRoom: () => void;
}

/**
 * The navigator on a phone: one full sheet with a touch caption (help, close), the tabs, the search box,
 * the rooms and the two large buttons. One markup serves both orientations; the stylesheet stacks it in
 * portrait and puts search and buttons in a column left of the rooms in landscape.
 */
export const HandheldNavigatorView: FC<HandheldNavigatorViewProps> = (props) => {
    const { title, tabs, activeTabCode, searchResult, liftedRooms, isFetching, isCreatorOpen, showPromote, resultsRef, onCreateRoom, onRandomRoom, onPromoteRoom } = props;
    const hasBlocks = !!searchResult?.results && searchResult.results.length > 0;

    return (
        <NativeTextTree>
            <div className="octane-handheld-nav">
                <header className="octane-handheld-nav__caption">
                    <span className="octane-handheld-nav__title">{title}</span>
                    <BaseButton
                        aria-label={LocalizeText('generic.help')}
                        className="octane-handheld-nav__caption-button is-help"
                        onClick={() => CreateLinkEvent('habbopages/navigator')}
                    />
                    <BaseButton
                        aria-label={LocalizeText('generic.close')}
                        className="octane-handheld-nav__caption-button is-close"
                        onClick={() => useNavigatorUiStore.getState().hide()}
                    />
                </header>
                <TabBar className="octane-handheld-nav__tabs" value={activeTabCode}>
                    {(tabs ?? []).map((context) => (
                        <TabBarTab
                            key={context.code}
                            value={context.code}
                            className={`octane-handheld-nav__tab${context.code === activeTabCode ? ' is-active' : ''}`}
                            onClick={() => {
                                useNavigatorRoomInfoPopupStore.getState().hide();
                                useNavigatorUiStore.getState().setTab(context.code);
                            }}
                        >
                            <span className="octane-handheld-nav__tab-label">{LocalizeText('navigator.toplevelview.' + context.code)}</span>
                        </TabBarTab>
                    ))}
                </TabBar>
                {!isCreatorOpen && (
                    <main className="octane-handheld-nav__body" aria-label={localizeWithFallback('navigator.title', 'Navigator')}>
                        <NavigatorSearchView searchResult={searchResult} />
                        <div ref={resultsRef} className="octane-handheld-nav__results">
                            {isFetching && <div className="octane-handheld-nav__busy" aria-hidden="true" />}
                            {searchResult?.code === NAVIGATOR_LIFTED_VIEW_CODE && !searchResult.data && <NavigatorLiftedRoomsView rooms={liftedRooms} />}
                            {hasBlocks &&
                                searchResult.results.map((result, index) => (
                                    <NavigatorSearchResultView
                                        key={result.code || index}
                                        searchResult={result}
                                        parentCode={searchResult.code}
                                        parentFilter={searchResult.data}
                                        forceOpen={searchResult.results.length === 1}
                                    />
                                ))}
                            {searchResult && !hasBlocks && <NavigatorEmptyStateView code={searchResult.code} />}
                        </div>
                        <div className="octane-handheld-nav__actions">
                            <BaseButton className="octane-handheld-nav__action is-create" onClick={onCreateRoom}>
                                {localizeWithFallback('navigator.create.room', LocalizeText('navigator.createroom.create'))}
                            </BaseButton>
                            {showPromote ? (
                                <BaseButton className="octane-handheld-nav__action is-promote" onClick={onPromoteRoom}>
                                    {LocalizeText('navigator.promote.room')}
                                </BaseButton>
                            ) : (
                                <BaseButton className="octane-handheld-nav__action is-random" onClick={onRandomRoom}>
                                    {LocalizeText('navigator.random.room')}
                                </BaseButton>
                            )}
                        </div>
                    </main>
                )}
                {isCreatorOpen && (
                    <WidgetErrorBoundary name="NavigatorRoomCreator">
                        <NavigatorRoomCreatorView />
                    </WidgetErrorBoundary>
                )}
            </div>
        </NativeTextTree>
    );
};
