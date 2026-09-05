import {
    AddLinkEventTracker,
    CreateLinkEvent,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomEngineEvent,
    RoomId,
    RoomObjectCategory,
    RoomObjectType, HabboSearchComposer, HabboSearchResultData, HabboSearchResultEvent } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { GetRoomSession, ISelectedUser, LocalizeText, SendMessageComposer } from '../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { useMessageEvent, useModTools, useOctaneEvent, useObjectSelectedEvent, useRoomUserListSnapshot } from '../../hooks';
import { ModToolsChatlogView } from './views/room/ModToolsChatlogView';
import { ModToolsRoomView } from './views/room/ModToolsRoomView';
import { ModToolsTicketsView } from './views/tickets/ModToolsTicketsView';
import { ModToolsUserChatlogView } from './views/user/ModToolsUserChatlogView';
import { ModToolsUserView } from './views/user/ModToolsUserView';

export const ModToolsView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentRoomId, setCurrentRoomId] = useState<number>(-1);
    const [selectedUser, setSelectedUser] = useState<ISelectedUser>(null);
    const [isTicketsVisible, setIsTicketsVisible] = useState(false);
    const [userQuery, setUserQuery] = useState('');
    const [userResults, setUserResults] = useState<HabboSearchResultData[]>(null);
    // The search packet is shared with the friend list, so only a search this window
    // started is allowed to fill this list.
    const isSearchingRef = useRef(false);
    const {
        tickets = [],
        openRooms = [],
        openRoomChatlogs = [],
        openUserChatlogs = [],
        openUserInfos = [],
        openRoomInfo = null,
        closeRoomInfo = null,
        toggleRoomInfo = null,
        openRoomChatlog = null,
        closeRoomChatlog = null,
        toggleRoomChatlog = null,
        openUserInfo = null,
        closeUserInfo = null,
        toggleUserInfo = null,
        openUserChatlog = null,
        closeUserChatlog = null,
        toggleUserChatlog = null
    } = useModTools();
    const elementRef = useRef<HTMLDivElement>(null);
    // Reactive room roster — used to auto-clear the selected user if
    // they leave the room while the panel is open, and to show an
    // online dot on the selected-user button without going through
    // userDataManager imperatively on every render.
    const roomUserList = useRoomUserListSnapshot();
    // Count of OPEN tickets the moderator hasn't picked yet — shown
    // as a badge on the Report Tool button so a new ticket is visible
    // immediately, without forcing the user to click through.
    const openTicketsCount = useMemo(() => tickets.filter((ticket) => ticket && ticket.state === 1).length, [tickets]);
    const isSelectedUserPresent = useMemo(
        () => !!(selectedUser && roomUserList.some((user) => user && user.webID === selectedUser.userId)),
        [selectedUser, roomUserList]
    );

    useOctaneEvent<RoomEngineEvent>([RoomEngineEvent.INITIALIZED, RoomEngineEvent.DISPOSED], (event) => {
        if (RoomId.isRoomPreviewerId(event.roomId)) return;

        switch (event.type) {
            case RoomEngineEvent.INITIALIZED:
                setCurrentRoomId(event.roomId);
                return;
            case RoomEngineEvent.DISPOSED:
                setCurrentRoomId(-1);
                return;
        }
    });

    useObjectSelectedEvent((event) => {
        if (event.category !== RoomObjectCategory.UNIT) return;

        const roomSession = GetRoomSession();

        if (!roomSession) return;

        const userData = roomSession.userDataManager.getUserDataByIndex(event.id);

        if (!userData || userData.type !== RoomObjectType.USER) return;

        setSelectedUser({ userId: userData.webID, username: userData.name });
    });

    useMessageEvent<HabboSearchResultEvent>(HabboSearchResultEvent, (event) => {
        if (!isSearchingRef.current) return;

        isSearchingRef.current = false;

        const parser = event.getParser();

        setUserResults([...(parser.friends ?? []), ...(parser.others ?? [])]);
    });

    // Searches as it is typed, with the same 350ms pause the furni editor uses: the name
    // goes out once the typing settles rather than once per keystroke.
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
        setSelectedUser({ userId: result.avatarId, username: result.avatarName });
        setUserResults(null);
        setUserQuery('');
    }, []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        return;
                    case 'open-room-info':
                        openRoomInfo(Number(parts[2]));
                        return;
                    case 'close-room-info':
                        closeRoomInfo(Number(parts[2]));
                        return;
                    case 'toggle-room-info':
                        toggleRoomInfo(Number(parts[2]));
                        return;
                    case 'open-room-chatlog':
                        openRoomChatlog(Number(parts[2]));
                        return;
                    case 'close-room-chatlog':
                        closeRoomChatlog(Number(parts[2]));
                        return;
                    case 'toggle-room-chatlog':
                        toggleRoomChatlog(Number(parts[2]));
                        return;
                    case 'open-user-info':
                        openUserInfo(Number(parts[2]));
                        return;
                    case 'close-user-info':
                        closeUserInfo(Number(parts[2]));
                        return;
                    case 'toggle-user-info':
                        toggleUserInfo(Number(parts[2]));
                        return;
                    case 'open-user-chatlog':
                        openUserChatlog(Number(parts[2]));
                        return;
                    case 'close-user-chatlog':
                        closeUserChatlog(Number(parts[2]));
                        return;
                    case 'toggle-user-chatlog':
                        toggleUserChatlog(Number(parts[2]));
                        return;
                }
            },
            eventUrlPrefix: 'mod-tools/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [
        openRoomInfo,
        closeRoomInfo,
        toggleRoomInfo,
        openRoomChatlog,
        closeRoomChatlog,
        toggleRoomChatlog,
        openUserInfo,
        closeUserInfo,
        toggleUserInfo,
        openUserChatlog,
        closeUserChatlog,
        toggleUserChatlog
    ]);

    const isInRoom = currentRoomId > 0;
    const isRoomInfoOpen = isInRoom && openRooms.includes(currentRoomId);
    const isRoomChatlogOpen = isInRoom && openRoomChatlogs.includes(currentRoomId);
    const isUserInfoOpen = selectedUser && openUserInfos.includes(selectedUser.userId);
    const noRoomHint = LocalizeText('modtools.window.no.room');

    return (
        <>
            {isVisible && (
                <OctaneCardView
                    className="octane-mod-tools min-w-0 w-[min(260px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                    theme="primary-slim"
                    uniqueKey="mod-tools"
                    windowPosition={DraggableWindowPosition.TOP_LEFT}
                >
                    <OctaneCardHeaderView headerText={LocalizeText('modtools.window.title')} onCloseClick={(event) => setIsVisible(false)} />
                    <OctaneCardContentView className="text-black" gap={2}>
                        {/* Room tools */}
                        <div className="flex flex-col gap-1.5">
                            <div className="text-[.6rem] uppercase tracking-wide opacity-60 font-semibold pl-1">
                                {LocalizeText('modtools.window.section.room')}
                            </div>
                            <Button
                                active={isRoomInfoOpen}
                                disabled={!isInRoom}
                                gap={2}
                                variant="secondary"
                                justifyContent="start"
                                title={!isInRoom ? noRoomHint : undefined}
                                onClick={() => CreateLinkEvent(`mod-tools/toggle-room-info/${currentRoomId}`)}
                            >
                                <div className="octane-icon icon-small-room shrink-0" />
                                <span className="grow text-start">{LocalizeText('modtools.window.tools.room')}</span>
                            </Button>
                            <Button
                                active={isRoomChatlogOpen}
                                disabled={!isInRoom}
                                gap={2}
                                variant="secondary"
                                innerRef={elementRef}
                                justifyContent="start"
                                title={!isInRoom ? noRoomHint : undefined}
                                onClick={() => CreateLinkEvent(`mod-tools/toggle-room-chatlog/${currentRoomId}`)}
                            >
                                <div className="octane-icon icon-chat-history shrink-0" />
                                <span className="grow text-start">{LocalizeText('modtools.window.tools.chatlog')}</span>
                            </Button>
                        </div>

                        {/* Selected user */}
                        <div className="flex flex-col gap-1.5">
                            <div className="text-[.6rem] uppercase tracking-wide opacity-60 font-semibold pl-1">
                                {LocalizeText('modtools.window.section.user')}
                            </div>
                            {selectedUser ? (
                                <div
                                    className={`flex flex-col gap-1.5 rounded p-1.5 border ${isSelectedUserPresent ? 'bg-gradient-to-r from-emerald-50 to-transparent border-emerald-100' : 'bg-gradient-to-r from-zinc-50 to-transparent border-zinc-200'}`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`inline-block w-2 h-2 rounded-full shrink-0 ${isSelectedUserPresent ? 'bg-emerald-500' : 'bg-zinc-400'}`}
                                            title={
                                                isSelectedUserPresent
                                                    ? LocalizeText('modtools.window.user.in_room')
                                                    : LocalizeText('modtools.window.user.left_room')
                                            }
                                            aria-label={
                                                isSelectedUserPresent
                                                    ? LocalizeText('modtools.userinfo.presence.in_room')
                                                    : LocalizeText('modtools.window.user.left_room')
                                            }
                                        />
                                        <span className="truncate grow text-start text-sm font-semibold leading-tight">{selectedUser.username}</span>
                                        <button
                                            className="inline-flex items-center justify-center w-5 h-5 rounded text-zinc-500 hover:text-rose-600 hover:bg-rose-100 shrink-0 transition-colors"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setSelectedUser(null);
                                            }}
                                            title={LocalizeText('modtools.window.user.clear')}
                                        >
                                            <FaTimes size={10} />
                                        </button>
                                    </div>
                                    <Button
                                        active={!!isUserInfoOpen}
                                        gap={2}
                                        justifyContent="start"
                                        variant="secondary"
                                        onClick={() => CreateLinkEvent(`mod-tools/toggle-user-info/${selectedUser.userId}`)}
                                    >
                                        <div className="octane-icon icon-user shrink-0" />
                                        <span className="grow text-start">{LocalizeText('modtools.window.user.open_info')}</span>
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 rounded p-2 border border-dashed border-zinc-300 bg-zinc-50/50">
                                        <div className="octane-icon icon-avatar-anonymous shrink-0 opacity-70" />
                                        <span className="text-xs italic">{LocalizeText('modtools.window.select.user')}</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            className="w-full pr-6"
                                            type="text"
                                            value={userQuery}
                                            placeholder={LocalizeText('generic.search')}
                                            onChange={(event) => setUserQuery(event.target.value)}
                                        />
                                        <FaSearch
                                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
                                            size={10}
                                        />
                                    </div>
                                    {userResults && !userResults.length && <div className="text-[.65rem] italic opacity-60 pl-1">
                                        {LocalizeText('generic.no_results_found')}
                                    </div>}
                                    {userResults && userResults.length > 0 && <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
                                        {userResults.slice(0, 12).map((result) => <button
                                            key={result.avatarId}
                                            className="flex items-center gap-2 rounded px-2 py-1 text-start hover:bg-zinc-100"
                                            type="button"
                                            onClick={() => pickUser(result)}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${result.isAvatarOnline ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                            <span className="truncate text-xs">{result.avatarName}</span>
                                        </button>)}
                                    </div>}
                                </div>
                            )}
                        </div>

                        {/* Reports */}
                        <div className="flex flex-col gap-1.5">
                            <div className="text-[.6rem] uppercase tracking-wide opacity-60 font-semibold pl-1">
                                {LocalizeText('modtools.window.section.reports')}
                            </div>
                            <Button active={isTicketsVisible} gap={2} justifyContent="start" variant="secondary" onClick={() => setIsTicketsVisible((prevValue) => !prevValue)}>
                                <div className="octane-icon icon-tickets shrink-0" />
                                <span className="grow text-start">{LocalizeText('modtools.window.tools.report')}</span>
                                {openTicketsCount > 0 && (
                                    <span
                                        className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-semibold shrink-0 [box-shadow:0_0_0_2px_rgba(244,63,94,.25)]"
                                        title={LocalizeText(
                                            openTicketsCount === 1 ? 'modtools.window.tickets.open' : 'modtools.window.tickets.open.many',
                                            ['count'],
                                            [openTicketsCount.toString()]
                                        )}
                                    >
                                        {openTicketsCount > 99 ? '99+' : openTicketsCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
            {openRooms.length > 0 &&
                openRooms.map((roomId) => (
                    <ModToolsRoomView key={roomId} roomId={roomId} onCloseClick={() => CreateLinkEvent(`mod-tools/close-room-info/${roomId}`)} />
                ))}
            {openRoomChatlogs.length > 0 &&
                openRoomChatlogs.map((roomId) => (
                    <ModToolsChatlogView key={roomId} roomId={roomId} onCloseClick={() => CreateLinkEvent(`mod-tools/close-room-chatlog/${roomId}`)} />
                ))}
            {openUserInfos.length > 0 &&
                openUserInfos.map((userId) => (
                    <ModToolsUserView key={userId} userId={userId} onCloseClick={() => CreateLinkEvent(`mod-tools/close-user-info/${userId}`)} />
                ))}
            {openUserChatlogs.length > 0 &&
                openUserChatlogs.map((userId) => (
                    <ModToolsUserChatlogView key={userId} userId={userId} onCloseClick={() => CreateLinkEvent(`mod-tools/close-user-chatlog/${userId}`)} />
                ))}
            {isTicketsVisible && <ModToolsTicketsView onCloseClick={() => setIsTicketsVisible(false)} />}
        </>
    );
};
