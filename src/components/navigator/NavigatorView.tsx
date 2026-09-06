import {
    AddLinkEventTracker,
    ConvertGlobalRoomIdMessageComposer,
    ForwardToSomeRoomMessageComposer,
    GetCategoriesWithUserCountMessageComposer,
    HabboWebTools,
    ILinkEventTracker,
    LegacyExternalInterface,
    NavigatorInitComposer,
    NavigatorSettingsEvent,
    RemoveLinkEventTracker,
    RoomSessionEvent
} from '@octane/renderer';
import { CSSProperties, FC, useEffect, useRef } from 'react';
import { CreateLinkEvent, LocalizeText, localizeWithFallback, SendMessageComposer, TryVisitRoom } from '../../api';
import createRoomImg from '../../assets/images/navigator/air/create-room.png';
import promoteRoomImg from '../../assets/images/navigator/air/promote-room.png';
import quicklinkAdd from '../../assets/images/navigator/air/quicklink-add.png';
import randomRoomImg from '../../assets/images/navigator/air/random-room.png';
import { DraggableWindow, WidgetErrorBoundary } from '../../common';
import {
    useMessageEvent,
    useNavigatorData,
    useNavigatorRoomInfoPopupStore,
    useNavigatorSearch,
    useNavigatorUiState,
    useNavigatorUiStore,
    useOctaneEvent
} from '../../hooks';
import { NavigatorDoorStateView } from './views/NavigatorDoorStateView';
import { NavigatorRoomCreatorView } from './views/NavigatorRoomCreatorView';
import { NavigatorRoomInfoView } from './views/NavigatorRoomInfoView';
import { NavigatorRoomLinkView } from './views/NavigatorRoomLinkView';
import { NavigatorRoomSettingsView } from './views/room-settings/NavigatorRoomSettingsView';
import { NavigatorEmptyStateView } from './views/search/NavigatorEmptyStateView';
import { NavigatorRoomInfoPopupView } from './views/search/NavigatorRoomInfoPopupView';
import { NavigatorSearchResultView } from './views/search/NavigatorSearchResultView';
import { NavigatorSearchSavesResultView } from './views/search/NavigatorSearchSavesResultView';
import { NavigatorSearchView } from './views/search/NavigatorSearchView';

const persistNavigatorBounds = (element: HTMLElement | null) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    useNavigatorUiStore.getState().persistWindowSettings({
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
    });
};

export const NavigatorView: FC<{}> = () => {
    const { topLevelContext, topLevelContexts, navigatorData, navigatorSearches } = useNavigatorData();
    const { searchResult, isFetching } = useNavigatorSearch();
    const { isVisible, isCreatorOpen, isRoomInfoOpen, isRoomLinkOpen, isOpenSavesSearches, needsInit, currentTabCode, windowHeight } = useNavigatorUiState();
    const elementRef = useRef<HTMLDivElement>(null);

    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.CREATED, () => {
        useNavigatorUiStore.getState().hide();
        useNavigatorUiStore.getState().closeCreator();
        useNavigatorRoomInfoPopupStore.getState().hide();
    });

    useMessageEvent<NavigatorSettingsEvent>(NavigatorSettingsEvent, (event) => {
        const parser = event.getParser();
        useNavigatorUiStore.getState().applyServerSettings({
            openSearches: parser.leftPanelHidden,
            windowX: parser.windowX,
            windowY: parser.windowY,
            windowHeight: parser.windowHeight
        });
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                if (parts.length < 2) return;
                const store = useNavigatorUiStore.getState();
                switch (parts[1]) {
                    case 'show':
                        store.show();
                        return;
                    case 'hide':
                    case 'close':
                        store.hide();
                        return;
                    case 'toggle':
                        store.toggle();
                        return;
                    case 'toggle-room-info':
                        store.toggleRoomInfo();
                        return;
                    case 'toggle-room-link':
                        store.toggleRoomLink();
                        return;
                    case 'goto': {
                        if (parts.length <= 2) return;
                        const target = parts.slice(2).join('/');
                        if (target === 'home') {
                            if (navigatorData.homeRoomId <= 0) return;
                            TryVisitRoom(navigatorData.homeRoomId);
                            return;
                        }
                        if (target === 'random_friending_room') {
                            SendMessageComposer(new ForwardToSomeRoomMessageComposer('random_friending_room'));
                            return;
                        }
                        const roomId = Number.parseInt(target, 10);
                        if (!Number.isNaN(roomId) && String(roomId) === target) {
                            TryVisitRoom(roomId);
                            return;
                        }
                        SendMessageComposer(new ConvertGlobalRoomIdMessageComposer(target));
                        return;
                    }
                    case 'create':
                        store.openCreator();
                        return;
                    case 'search':
                        store.setSearch('hotel_view', parts.slice(2).join('/'));
                        store.show();
                        return;
                    case 'tag':
                        store.setSearch('hotel_view', `tag:${parts.slice(2).join('/')}`);
                        store.show();
                        return;
                    case 'tab':
                        if (parts[2]) store.setTab(parts[2]);
                        store.show();
                        return;
                    case 'me':
                        store.setTab('myworld_view');
                        store.show();
                        return;
                }
            },
            eventUrlPrefix: 'navigator/'
        };
        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [navigatorData]);

    useEffect(() => {
        if (!searchResult) return;
        if (elementRef.current) elementRef.current.scrollTop = 0;
        useNavigatorRoomInfoPopupStore.getState().hide();
    }, [searchResult]);

    useEffect(() => {
        if (!isVisible || !needsInit) return;
        SendMessageComposer(new NavigatorInitComposer());
        SendMessageComposer(new GetCategoriesWithUserCountMessageComposer());
        useNavigatorUiStore.getState().markInitDone();
    }, [isVisible, needsInit]);

    useEffect(() => {
        LegacyExternalInterface.addCallback(HabboWebTools.OPENROOM, (k: string) => SendMessageComposer(new ConvertGlobalRoomIdMessageComposer(k)));
    }, []);

    useEffect(() => {
        useNavigatorUiStore.getState().hydrateAirPreferences();
    }, []);

    useEffect(() => {
        if (!isVisible) useNavigatorRoomInfoPopupStore.getState().hide();
    }, [isVisible]);

    const quickLinksLabel = localizeWithFallback('navigator.quick.links.title', 'Quick links');
    const navigatorLabel = localizeWithFallback('navigator.title', 'Navigator');
    const quickLinksToggleLabel = localizeWithFallback('navigator.tooltip.left.show.hide', 'Show or hide quick links');
    const showPromote = searchResult?.code === 'myworld_view' || searchResult?.code === 'roomads_view';
    const headerText = isCreatorOpen
        ? LocalizeText('navigator.createroom.title')
        : isFetching
          ? LocalizeText('navigator.title.is.busy')
          : LocalizeText('navigator.title');

    const onToggleQuickLinks = () => {
        useNavigatorRoomInfoPopupStore.getState().hide();
        useNavigatorUiStore.getState().toggleSavesSearches();
        persistNavigatorBounds(document.querySelector('.octane-navigator-air') as HTMLElement | null);
    };

    const onCreateRoom = () => {
        useNavigatorRoomInfoPopupStore.getState().hide();
        useNavigatorUiStore.getState().openCreator();
    };

    const onRandomRoom = () => {
        useNavigatorRoomInfoPopupStore.getState().hide();
        CreateLinkEvent('navigator/goto/random_friending_room');
        useNavigatorUiStore.getState().hide();
    };

    const onPromoteRoom = () => {
        useNavigatorRoomInfoPopupStore.getState().hide();
        CreateLinkEvent('catalog/open/room_event');
    };

    return (
        <>
            {isVisible && (
                <DraggableWindow uniqueKey="navigator" handleSelector=".octane-navigator-air__caption">
                    <div
                        className={`octane-navigator-air max-w-[calc(100vw-16px)]${isOpenSavesSearches ? ' is-quick-links' : ''}`}
                        data-air-frame="ubuntu-3"
                        style={{ '--navigator-height': `${windowHeight || 628}px` } as CSSProperties}
                    >
                        <div className="octane-navigator-air__skin" aria-hidden="true" />
                        <div className="octane-navigator-air__tab-shelf" aria-hidden="true" />
                        <div className="octane-navigator-air__caption">
                            <span className="octane-navigator-air__title">{headerText}</span>
                            <button
                                type="button"
                                className="octane-navigator-air__close"
                                aria-label={LocalizeText('generic.close')}
                                onClick={() => useNavigatorUiStore.getState().hide()}
                            />
                        </div>
                        <button
                            type="button"
                            className="octane-navigator-air__quick-toggle"
                            aria-label={quickLinksToggleLabel}
                            aria-expanded={isOpenSavesSearches}
                            onClick={onToggleQuickLinks}
                        >
                            <img src={quicklinkAdd} alt="" width={18} height={18} />
                        </button>
                        <div className="octane-navigator-air__tabs" role="tablist">
                            {topLevelContexts &&
                                topLevelContexts.length > 0 &&
                                topLevelContexts.map((context) => {
                                    const active = (currentTabCode ? currentTabCode === context.code : topLevelContext === context) && !isCreatorOpen;

                                    return (
                                        <button
                                            key={context.code}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            className={`octane-navigator-air__tab${active ? ' is-active' : ''}`}
                                            onClick={() => {
                                                useNavigatorRoomInfoPopupStore.getState().hide();
                                                useNavigatorUiStore.getState().setTab(context.code);
                                            }}
                                        >
                                            {LocalizeText('navigator.toplevelview.' + context.code)}
                                        </button>
                                    );
                                })}
                        </div>
                        <div className="octane-navigator-air__body">
                            {!isCreatorOpen && (
                                <div className="octane-navigator-air__workspace">
                                    {isOpenSavesSearches && (
                                        <nav className="octane-navigator-air__quick-links" aria-label={quickLinksLabel}>
                                            <NavigatorSearchSavesResultView searches={navigatorSearches || []} />
                                        </nav>
                                    )}
                                    <main className="octane-navigator-air__main" aria-label={navigatorLabel}>
                                        <NavigatorSearchView searchResult={searchResult} />
                                        <div ref={elementRef} className="octane-navigator-air__results">
                                            {isFetching && <div className="octane-navigator-air__busy-mask" aria-hidden="true" />}
                                            {searchResult &&
                                                searchResult.results.map((result, index) => (
                                                    <NavigatorSearchResultView
                                                        key={result.code || index}
                                                        searchResult={result}
                                                        parentCode={searchResult.code}
                                                        parentFilter={searchResult.data}
                                                        forceOpen={searchResult.results.length === 1}
                                                    />
                                                ))}
                                            {searchResult && (!searchResult.results || searchResult.results.length === 0) && (
                                                <NavigatorEmptyStateView code={searchResult.code} />
                                            )}
                                        </div>
                                        <div className="octane-navigator-air__actions">
                                            <button
                                                type="button"
                                                className="octane-navigator-air__action octane-navigator-air__action--create"
                                                onClick={onCreateRoom}
                                            >
                                                <img src={createRoomImg} alt="" />
                                                <span>{LocalizeText('navigator.createroom.create')}</span>
                                                <i className="octane-navigator-air__action-border" aria-hidden="true" />
                                            </button>
                                            {!showPromote && (
                                                <button
                                                    type="button"
                                                    className="octane-navigator-air__action octane-navigator-air__action--random"
                                                    onClick={onRandomRoom}
                                                >
                                                    <img src={randomRoomImg} alt="" />
                                                    <span>{LocalizeText('navigator.random.room')}</span>
                                                    <i className="octane-navigator-air__action-border" aria-hidden="true" />
                                                </button>
                                            )}
                                            {showPromote && (
                                                <button
                                                    type="button"
                                                    className="octane-navigator-air__action octane-navigator-air__action--promote"
                                                    onClick={onPromoteRoom}
                                                >
                                                    <img src={promoteRoomImg} alt="" />
                                                    <span>{LocalizeText('navigator.promote.room')}</span>
                                                    <i className="octane-navigator-air__action-border" aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    </main>
                                </div>
                            )}
                            {isCreatorOpen && (
                                <WidgetErrorBoundary name="NavigatorRoomCreator">
                                    <NavigatorRoomCreatorView />
                                </WidgetErrorBoundary>
                            )}
                        </div>
                    </div>
                </DraggableWindow>
            )}
            <NavigatorRoomInfoPopupView />
            <WidgetErrorBoundary name="NavigatorDoorState">
                <NavigatorDoorStateView />
            </WidgetErrorBoundary>
            {isRoomInfoOpen && (
                <WidgetErrorBoundary name="NavigatorRoomInfo">
                    <NavigatorRoomInfoView onCloseClick={() => useNavigatorUiStore.getState().setRoomInfoOpen(false)} />
                </WidgetErrorBoundary>
            )}
            {isRoomLinkOpen && (
                <WidgetErrorBoundary name="NavigatorRoomLink">
                    <NavigatorRoomLinkView onCloseClick={() => useNavigatorUiStore.getState().setRoomLinkOpen(false)} />
                </WidgetErrorBoundary>
            )}
            <WidgetErrorBoundary name="NavigatorRoomSettings">
                <NavigatorRoomSettingsView />
            </WidgetErrorBoundary>
        </>
    );
};
