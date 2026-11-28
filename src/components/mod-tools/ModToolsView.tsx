import {
    AddLinkEventTracker,
    CreateLinkEvent,
    HabboSearchComposer,
    HabboSearchResultData,
    HabboSearchResultEvent,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomEngineEvent,
    RoomId,
    RoomObjectCategory,
    RoomObjectType,
    UserClassificationMessageEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GetRoomSession, LocalizeText, localizeWithFallback, SendMessageComposer, TryVisitRoom } from '../../api';
import { activeModPage, backModPage, focusModPage, modPageId, openedModPages } from '../../api/mod-tools/handheldModPages';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import {
    MOD_WINDOW_SIZE,
    useHasPermission,
    useIssueManager,
    useMessageEvent,
    useModTools,
    useModWindowTrackerStore,
    useObjectSelectedEvent,
    useOctaneEvent,
    useOpenIssueCount,
    useRoomUserListSnapshot
} from '../../hooks';
import { useHandheldLayout, useIsHandheld } from '../../hooks/handheld/useHandheldLayout';
import { HandheldModPageContext } from './handheld/HandheldModPage';
import { HandheldModToolsView } from './handheld/HandheldModToolsView';
import { EvidenceChatlogView } from './views/EvidenceChatlogView';
import { IssueBrowserView } from './views/IssueBrowserView';
import { IssueHandlerView } from './views/IssueHandlerView';
import { ModActionView } from './views/ModActionView';
import { NativeAlertView } from './views/NativeAlertView';
import { RoomToolView } from './views/RoomToolView';
import { RoomVisitsView } from './views/RoomVisitsView';
import { SendMessageView } from './views/SendMessageView';
import { StartPanelView } from './views/StartPanelView';
import { UserClassificationEntry, UserClassificationView } from './views/UserClassificationView';
import { UserInfoView } from './views/UserInfoView';
import { UserRecordKind, UserRecordsView } from './views/UserRecordsView';

interface SelectedUser {
    userId: number;
    username: string;
    figure?: string;
    gender?: string | number;
}

/**
 * AIR ModerationManager / StartPanelCtrl: the start panel opens when the moderator init message arrives, the room and chatlog buttons follow the room entered /
 * left events, the user button follows the last selected avatar (or a user found by name) and stays enabled after the room is left. Every other moderator window
 * is placed by the window tracker next to the window it was opened from; the `mod-tools/...` links open, close and toggle them from anywhere in the client.
 */
export const ModToolsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentRoomId, setCurrentRoomId] = useState<number>(-1);
    // the room buttons are enabled by the room entered event and disabled by the room left event; a panel created while a room is already open starts with them disabled
    const [roomEntered, setRoomEntered] = useState(false);
    const [chatlogEnabled, setChatlogEnabled] = useState(false);
    const [ticketQueueEnabled, setTicketQueueEnabled] = useState(false);
    const panelCreatedRef = useRef(false);
    const [classifications, setClassifications] = useState<UserClassificationEntry[]>([]);
    const [selectedUser, setSelectedUser] = useState<SelectedUser>(null);
    const [userQuery, setUserQuery] = useState('');
    const [userResults, setUserResults] = useState<HabboSearchResultData[]>(null);
    // The search packet is shared with the friend list, so only a search this window started is allowed to fill this list.
    const isSearchingRef = useRef(false);
    const windows = useModWindowTrackerStore((state) => state.windows);
    const showWindow = useModWindowTrackerStore((state) => state.show);
    const closeWindow = useModWindowTrackerStore((state) => state.close);
    const hideWindow = useModWindowTrackerStore((state) => state.hide);
    const resizeWindow = useModWindowTrackerStore((state) => state.resize);
    const startPanel = useModWindowTrackerStore((state) => state.startPanel);
    const setStartPanel = useModWindowTrackerStore((state) => state.setStartPanel);
    const { settings = null, cfhCategories = [] } = useModTools();
    const settingsRef = useRef<typeof settings>(null);
    const issueContext = useIssueManager();
    const openIssueCount = useOpenIssueCount();
    const roomUserList = useRoomUserListSnapshot();
    const isSelectedUserPresent = useMemo(() => !!(selectedUser && roomUserList.some((user) => user && user.webID === selectedUser.userId)), [selectedUser, roomUserList]);
    // the toolbar's moderator button (and anything else linking `mod-tools/show|hide|toggle`) only reaches the start panel for a moderator
    const canUseModTools = useHasPermission('acc_supporttool');
    const canUseModToolsRef = useRef(false);
    // Phone: the windows are the pages of one sheet. `pageFocus` is the order they were gone to in (the last one in front),
    // `pageTitles` what each page calls itself on its tab.
    const isHandheld = useIsHandheld();
    const { orientation } = useHandheldLayout();
    const isHandheldRef = useRef(isHandheld);
    const [pageFocus, setPageFocus] = useState<string[]>([]);
    const [pageTitles, setPageTitles] = useState<Record<string, string>>({});
    const [seenWindows, setSeenWindows] = useState(windows);

    // a window opened (or shown again) comes to the front of the sheet, and opens the sheet when it was put away
    if (seenWindows !== windows) {
        const opened = openedModPages(seenWindows, windows);

        setSeenWindows(windows);

        if (isHandheld && opened.length) {
            setPageFocus((focus) => opened.reduce<string[]>((next, id) => focusModPage(next, id), focus));
            setIsVisible(true);
        }
    }

    useLayoutEffect(() => {
        isHandheldRef.current = isHandheld;
    }, [isHandheld]);

    // On a phone a window that is open already is not closed by its "toggle" (its page is brought to the front instead):
    // there is no window on screen to see it go. Everything else is the desktop's own call.
    const show = useCallback(
        (request: Parameters<typeof showWindow>[0]) => {
            if (isHandheldRef.current && request.toggle) {
                const existing = useModWindowTrackerStore.getState().get(request.type, request.key);

                if (existing && !existing.hidden) {
                    setPageFocus((focus) => focusModPage(focus, modPageId(request.type, request.key)));
                    setIsVisible(true);

                    return;
                }
            }

            showWindow(request);
        },
        [showWindow]
    );
    const reportPageTitle = useCallback((id: string, title: string) => setPageTitles((titles) => (titles[id] === title ? titles : { ...titles, [id]: title })), []);

    useEffect(() => {
        canUseModToolsRef.current = canUseModTools || !!settings;
    }, [canUseModTools, settings]);

    useEffect(() => {
        settingsRef.current = settings;

        if (!settings) return;

        // StartPanelCtrl.show(): the frame is created once (user, room tool and chatlog buttons start disabled, the ticket queue follows the call for help
        // permission); every later init message only makes the existing frame visible again.
        if (!panelCreatedRef.current) {
            panelCreatedRef.current = true;
            setRoomEntered(false);
            setChatlogEnabled(false);
            setTicketQueueEnabled(settings.cfhPermission);
        } else setTicketQueueEnabled(settings.cfhPermission);

        setIsVisible(true);
    }, [settings]);

    useOctaneEvent<RoomEngineEvent>([RoomEngineEvent.INITIALIZED, RoomEngineEvent.DISPOSED], (event) => {
        if (RoomId.isRoomPreviewerId(event.roomId)) return;

        const entered = event.type === RoomEngineEvent.INITIALIZED;

        setCurrentRoomId(entered ? event.roomId : -1);
        setRoomEntered(entered && panelCreatedRef.current);
        setChatlogEnabled(entered && panelCreatedRef.current && !!settingsRef.current?.chatlogsPermission);
    });

    // AIR ModerationMessageHandler.onRoomUserClassification: a new classification window opens (and replaces the one open) with the users of the message
    useMessageEvent<UserClassificationMessageEvent>(UserClassificationMessageEvent, (event) => {
        if (!settingsRef.current) return;

        const parser = event.getParser();
        const names = parser?.classifiedUsernameMap;
        const types = parser?.classifiedUserTypeMap;

        if (!names || !types) return;

        const entries: UserClassificationEntry[] = [];

        for (const [userId, userName] of names) entries.push({ userId, userName, classType: types.get(userId) ?? '' });

        setClassifications(entries);
        closeWindow('userClassification', '1');
        showWindow({ type: 'userClassification', key: '1', ...MOD_WINDOW_SIZE.userClassification, parent: null });
    });

    useObjectSelectedEvent((event) => {
        if (event.category !== RoomObjectCategory.UNIT) return;

        const userData = GetRoomSession()?.userDataManager.getUserDataByIndex(event.id);

        if (!userData || userData.type !== RoomObjectType.USER) return;

        setSelectedUser({ userId: userData.webID, username: userData.name, figure: userData.figure, gender: userData.sex });
    });

    useMessageEvent<HabboSearchResultEvent>(HabboSearchResultEvent, (event) => {
        if (!isSearchingRef.current) return;

        isSearchingRef.current = false;

        const parser = event.getParser();

        setUserResults([...(parser.friends ?? []), ...(parser.others ?? [])]);
    });

    // Searches as it is typed, with a 350ms pause: the name goes out once the typing settles rather than once per keystroke.
    useEffect(() => {
        const name = userQuery.trim();

        if (name.length < 2) {
            setUserResults(null);
            return;
        }

        const handle = window.setTimeout(() => {
            isSearchingRef.current = true;
            SendMessageComposer(new HabboSearchComposer(name));
        }, 350);

        return () => window.clearTimeout(handle);
    }, [userQuery]);

    const pickUser = useCallback((result: HabboSearchResultData) => {
        setSelectedUser({ userId: result.avatarId, username: result.avatarName, figure: result.avatarFigure, gender: result.avatarGender });
        setUserResults(null);
        setUserQuery('');
    }, []);

    useEffect(() => {
        const parent = () => useModWindowTrackerStore.getState().startPanel;
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        if (canUseModToolsRef.current) setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        if (canUseModToolsRef.current) setIsVisible((visible) => !visible);
                        return;
                    case 'open-room-info':
                    case 'toggle-room-info':
                        show({ type: 'roomTool', key: parts[2], ...MOD_WINDOW_SIZE.roomTool, parent: parent(), toggle: parts[1] === 'toggle-room-info' });
                        return;
                    case 'close-room-info':
                        closeWindow('roomTool', parts[2]);
                        return;
                    case 'open-room-chatlog':
                    case 'toggle-room-chatlog':
                        show({ type: 'roomChatlog', key: parts[2], ...MOD_WINDOW_SIZE.roomChatlog, parent: parent(), toggle: parts[1] === 'toggle-room-chatlog' });
                        return;
                    case 'close-room-chatlog':
                        closeWindow('roomChatlog', parts[2]);
                        return;
                    case 'open-user-info':
                    case 'toggle-user-info':
                        show({ type: 'userInfo', key: parts[2], ...MOD_WINDOW_SIZE.userInfo, parent: parent(), toggle: parts[1] === 'toggle-user-info' });
                        return;
                    case 'close-user-info':
                        closeWindow('userInfo', parts[2]);
                        return;
                    case 'open-user-chatlog':
                    case 'toggle-user-chatlog':
                        show({ type: 'userChatlog', key: parts[2], ...MOD_WINDOW_SIZE.userChatlog, parent: parent(), toggle: parts[1] === 'toggle-user-chatlog' });
                        return;
                    case 'close-user-chatlog':
                        closeWindow('userChatlog', parts[2]);
                        return;
                    case 'open-tickets':
                        show({ type: 'issueBrowser', key: 'main', ...MOD_WINDOW_SIZE.issueBrowser, parent: null });
                        return;
                }
            },
            eventUrlPrefix: 'mod-tools/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [show, closeWindow]);

    const isInRoom = currentRoomId > 0 && roomEntered;
    const enterRoom = (roomId: number) => TryVisitRoom(roomId);

    // one tool window (its type decides the view); on a phone the same views draw themselves as pages of the sheet
    const renderWindow = (entry: (typeof windows)[number]) => {
        if (entry.hidden) return null;

        const key = `${entry.type}:${entry.key}:${entry.revision}`;

        if (entry.type === 'roomTool') {
            return (
                <RoomToolView
                    key={key}
                    currentRoomId={isInRoom ? currentRoomId : 0}
                    roomId={Number(entry.key)}
                    settings={settings}
                    x={entry.x}
                    y={entry.y}
                    onClose={() => closeWindow('roomTool', entry.key)}
                    onOpenChatlog={(id) => show({ type: 'roomChatlog', key: `${id}`, ...MOD_WINDOW_SIZE.roomChatlog, parent: entry, toggle: true })}
                    onOpenUserInfo={(id) => show({ type: 'userInfo', key: `${id}`, ...MOD_WINDOW_SIZE.userInfo, parent: entry, toggle: true })}
                />
            );
        }

        if (entry.type === 'userInfo') {
            return (
                <UserInfoView
                    key={key}
                    settings={settings}
                    userId={Number(entry.key)}
                    x={entry.x}
                    y={entry.y}
                    onClose={() => closeWindow('userInfo', entry.key)}
                    onOpenChatlog={() => show({ type: 'userChatlog', key: entry.key, ...MOD_WINDOW_SIZE.userChatlog, parent: entry, below: true, toggle: true })}
                    onOpenModAction={(userName) =>
                        show({ type: 'modAction', key: userName, ...MOD_WINDOW_SIZE.modAction, parent: entry, below: true, toggle: true, params: { userId: Number(entry.key) } })
                    }
                    onOpenRecords={(kind, userName) =>
                        show({ type: 'userRecords', key: `${entry.key}:${kind}`, ...MOD_WINDOW_SIZE.userRecords, parent: entry, below: true, toggle: true, params: { userId: Number(entry.key), userName, kind } })
                    }
                    onOpenRoomVisits={() => show({ type: 'roomVisits', key: entry.key, ...MOD_WINDOW_SIZE.roomVisits, parent: entry, below: true, toggle: true })}
                    onOpenSendMessage={(userName) =>
                        show({ type: 'sendMessage', key: userName, ...MOD_WINDOW_SIZE.sendMessage, parent: entry, below: true, toggle: true, params: { userId: Number(entry.key) } })
                    }
                />
            );
        }

        if (entry.type === 'userChatlog' || entry.type === 'roomChatlog' || entry.type === 'cfhChatlog') {
            return (
                <EvidenceChatlogView
                    key={key}
                    height={entry.height}
                    id={Number(entry.key)}
                    kind={entry.type === 'userChatlog' ? 'user' : entry.type === 'roomChatlog' ? 'room' : 'cfh'}
                    width={entry.width}
                    x={entry.x}
                    y={entry.y}
                    onClose={() => closeWindow(entry.type, entry.key)}
                    onEnterRoom={enterRoom}
                    onOpenRoomTool={(roomId) => show({ type: 'roomTool', key: `${roomId}`, ...MOD_WINDOW_SIZE.roomTool, parent: entry, toggle: true })}
                    onOpenUserInfo={(userId) => show({ type: 'userInfo', key: `${userId}`, ...MOD_WINDOW_SIZE.userInfo, parent: entry, toggle: true })}
                    onResize={(width, height) => resizeWindow(entry.type, entry.key, width, height)}
                />
            );
        }

        if (entry.type === 'userClassification') {
            return (
                <UserClassificationView
                    key={key}
                    entries={classifications}
                    height={entry.height}
                    width={entry.width}
                    x={entry.x}
                    y={entry.y}
                    onClose={() => closeWindow('userClassification', entry.key)}
                    onOpenUserInfo={(userId) => show({ type: 'userInfo', key: `${userId}`, ...MOD_WINDOW_SIZE.userInfo, parent: entry, toggle: true })}
                    onResize={(width, height) => resizeWindow('userClassification', entry.key, width, height)}
                />
            );
        }

        if (entry.type === 'roomVisits') {
            return (
                <RoomVisitsView
                    key={key}
                    height={entry.height}
                    userId={Number(entry.key)}
                    width={entry.width}
                    x={entry.x}
                    y={entry.y}
                    onClose={() => closeWindow('roomVisits', entry.key)}
                    onEnterRoom={enterRoom}
                    onOpenRoomTool={(roomId) => show({ type: 'roomTool', key: `${roomId}`, ...MOD_WINDOW_SIZE.roomTool, parent: entry, toggle: true })}
                    onResize={(width, height) => resizeWindow('roomVisits', entry.key, width, height)}
                />
            );
        }

        if (entry.type === 'userRecords') {
            return (
                <UserRecordsView
                    key={key}
                    height={entry.height}
                    kind={Number(entry.params.kind) as UserRecordKind}
                    userId={Number(entry.params.userId)}
                    userName={String(entry.params.userName)}
                    width={entry.width}
                    x={entry.x}
                    y={entry.y}
                    onClose={() => closeWindow('userRecords', entry.key)}
                    onResize={(width, height) => resizeWindow('userRecords', entry.key, width, height)}
                />
            );
        }

        if (entry.type === 'issueBrowser') {
            return (
                <IssueBrowserView
                    key={key}
                    context={issueContext}
                    height={entry.height}
                    localize={LocalizeText}
                    width={entry.width}
                    x={entry.x}
                    y={entry.y}
                    onClose={() => hideWindow('issueBrowser', entry.key)}
                    onResize={(width, height) => resizeWindow('issueBrowser', entry.key, width, height)}
                />
            );
        }

        if (entry.type === 'issueHandler') {
            return (
                <IssueHandlerView
                    key={key}
                    bundleId={Number(entry.key)}
                    categories={cfhCategories}
                    context={issueContext}
                    height={entry.height}
                    localize={LocalizeText}
                    settings={settings}
                    width={entry.width}
                    x={entry.x}
                    y={entry.y}
                    onClose={() => closeWindow('issueHandler', entry.key)}
                    onEnterRoom={enterRoom}
                    onOpenChatlog={(userId) => show({ type: 'userChatlog', key: `${userId}`, ...MOD_WINDOW_SIZE.userChatlog, parent: entry, toggle: true })}
                    onOpenModAction={(userId, userName) => show({ type: 'modAction', key: userName, ...MOD_WINDOW_SIZE.modAction, parent: entry, toggle: true, params: { userId } })}
                    onOpenRecords={(userId, kind, userName) =>
                        show({ type: 'userRecords', key: `${userId}:${kind}`, ...MOD_WINDOW_SIZE.userRecords, parent: entry, toggle: true, params: { userId, userName, kind } })
                    }
                    onOpenRoomTool={(roomId) => show({ type: 'roomTool', key: `${roomId}`, ...MOD_WINDOW_SIZE.roomTool, parent: null, toggle: true })}
                    onOpenRoomVisits={(userId) => show({ type: 'roomVisits', key: `${userId}`, ...MOD_WINDOW_SIZE.roomVisits, parent: entry, toggle: true })}
                    onOpenSendMessage={(userId, userName) => show({ type: 'sendMessage', key: userName, ...MOD_WINDOW_SIZE.sendMessage, parent: entry, toggle: true, params: { userId } })}
                    onOpenUserInfo={(userId, parent) => show({ type: 'userInfo', key: `${userId}`, ...MOD_WINDOW_SIZE.userInfo, parent, toggle: true })}
                    onResize={(width, height) => resizeWindow('issueHandler', entry.key, width, height)}
                />
            );
        }

        if (entry.type === 'modAction') {
            return <ModActionView key={key} settings={settings} userId={Number(entry.params.userId)} userName={entry.key} x={entry.x} y={entry.y} onClose={() => closeWindow('modAction', entry.key)} />;
        }

        if (entry.type === 'sendMessage') {
            return <SendMessageView key={key} settings={settings} userId={Number(entry.params.userId)} userName={entry.key} x={entry.x} y={entry.y} onClose={() => closeWindow('sendMessage', entry.key)} />;
        }

        return null;
    };

    if (isHandheld) {
        const open = windows.filter((entry) => !entry.hidden);
        const activeId = activeModPage(pageFocus, open);
        const sideBySide = orientation === 'landscape';
        const goBack = () => setPageFocus((focus) => backModPage(focus, open));
        const activate = (id: string) => setPageFocus((focus) => focusModPage(focus, id));

        return (
            <NativeTextTree>
                <>
                    {isVisible && settings && (
                        <HandheldModToolsView
                            activeId={activeId}
                            pages={open.map((entry) => {
                                const id = modPageId(entry.type, entry.key);

                                return { id, label: pageTitles[id] ?? '...' };
                            })}
                            sideBySide={sideBySide}
                            start={{
                                canUseChatlog: isInRoom && chatlogEnabled,
                                canUseRoomTool: isInRoom,
                                canUseTicketQueue: ticketQueueEnabled,
                                canUseUserInfo: !!selectedUser,
                                noResultsText: localizeWithFallback('generic.no_results_found', 'No results found'),
                                noRoomHint: localizeWithFallback('modtools.window.no.room', 'Enter a room first'),
                                openIssueCount,
                                roomId: isInRoom ? currentRoomId : 0,
                                searchPlaceholder: localizeWithFallback('generic.search', 'Search'),
                                searchQuery: userQuery,
                                searchResults: userResults,
                                selectedUser: selectedUser ? { ...selectedUser, present: isSelectedUserPresent } : null,
                                onChatlog: () => CreateLinkEvent(`mod-tools/toggle-room-chatlog/${currentRoomId}`),
                                onClearUser: () => setSelectedUser(null),
                                onPickUser: pickUser,
                                onRoomTool: () => CreateLinkEvent(`mod-tools/toggle-room-info/${currentRoomId}`),
                                onSearchQuery: setUserQuery,
                                // the desktop button shows (or shows again) the browser; an open one is only brought to the front
                                onTicketQueue: () =>
                                    open.some((entry) => entry.type === 'issueBrowser')
                                        ? activate(modPageId('issueBrowser', 'main'))
                                        : showWindow({ type: 'issueBrowser', key: 'main', ...MOD_WINDOW_SIZE.issueBrowser, parent: null }),
                                onUserInfo: () => selectedUser && CreateLinkEvent(`mod-tools/toggle-user-info/${selectedUser.userId}`)
                            }}
                            onActivate={activate}
                            onClose={() => setIsVisible(false)}
                            onClosePage={(id) => {
                                const entry = open.find((candidate) => modPageId(candidate.type, candidate.key) === id);

                                // the issue browser's close only hides it, as on the desktop
                                if (entry) (entry.type === 'issueBrowser' ? hideWindow : closeWindow)(entry.type, entry.key);
                            }}
                        >
                            {open.map((entry) => {
                                const id = modPageId(entry.type, entry.key);

                                return (
                                    <HandheldModPageContext.Provider key={id} value={{ id, active: id === activeId, sideBySide, onBack: goBack, reportTitle: reportPageTitle }}>
                                        {renderWindow(entry)}
                                    </HandheldModPageContext.Provider>
                                );
                            })}
                        </HandheldModToolsView>
                    )}
                    <NativeAlertView />
                </>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <>
                {isVisible && settings && (
                    <StartPanelView
                        canUseChatlog={isInRoom && chatlogEnabled}
                        canUseRoomTool={isInRoom}
                        canUseTicketQueue={ticketQueueEnabled}
                        canUseUserInfo={!!selectedUser}
                        noResultsText={LocalizeText('generic.no_results_found')}
                        noRoomHint={localizeWithFallback('modtools.window.no.room', 'Enter a room first')}
                        openIssueCount={openIssueCount}
                        searchPlaceholder={LocalizeText('generic.search')}
                        searchQuery={userQuery}
                        searchResults={userResults}
                        selectedUser={selectedUser ? { ...selectedUser, present: isSelectedUserPresent } : null}
                        userCaption={selectedUser ? localizeWithFallback('octane.mod_tools.user_info_username', 'User info: %username%', ['username'], [String(selectedUser.username)]) : localizeWithFallback('octane.mod_tools.user_info_2', 'User info:')}
                        x={startPanel.x}
                        y={startPanel.y}
                        onChatlog={() => CreateLinkEvent(`mod-tools/toggle-room-chatlog/${currentRoomId}`)}
                        onClearUser={() => setSelectedUser(null)}
                        onClose={() => setIsVisible(false)}
                        onMove={(x, y) => setStartPanel({ ...startPanel, x, y })}
                        onPickUser={pickUser}
                        onRoomTool={() => CreateLinkEvent(`mod-tools/toggle-room-info/${currentRoomId}`)}
                        onSearchQuery={setUserQuery}
                        onTicketQueue={() => showWindow({ type: 'issueBrowser', key: 'main', ...MOD_WINDOW_SIZE.issueBrowser, parent: null })}
                        onUserInfo={() => selectedUser && CreateLinkEvent(`mod-tools/toggle-user-info/${selectedUser.userId}`)}
                    />
                )}
                {/* every window reads the moderator's permissions and templates: nothing opens before the init message */}
                {settings && windows.map((entry) => renderWindow(entry))}
                <NativeAlertView />
            </>
        </NativeTextTree>
    );
};
