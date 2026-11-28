import { HabboSearchResultData } from '@octane/renderer';
import { FC, ReactNode } from 'react';
import { localizeWithFallback } from '../../../api';
import { MOD_START_PAGE } from '../../../api/mod-tools/handheldModPages';
import userIcon from '../../../assets/mod-tools/images/placeholder_avatar_small_head_cropped_png.png';
import chatlogIcon from '../../../assets/mod-tools/images/roomtools_chat_history.png';
import roomToolIcon from '../../../assets/mod-tools/images/roomtools_history_open_icon.png';
import ticketIcon from '../../../assets/mod-tools/images/tools_file_icon.png';
import { BaseButton } from '../../../common/BaseButton';
import { DraggableWindow } from '../../../common/draggable-window';
import { HandheldSheetFrame } from '../../../common/handheld/HandheldSheetFrame';
import { LayoutAvatarImageView } from '../../../common/layout/LayoutAvatarImageView';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { resolveAvatarFigure } from '../../friends/views/friends-list/resolveAvatarFigure';
import { resolveAvatarGender } from '../../friends/views/friends-list/resolveAvatarGender';
import { StartPanelSelectedUser } from '../views/StartPanelView';
import { HandheldModChevron, HandheldModCross, HandheldModHeading, HandheldModNote } from './HandheldModPage';

export interface HandheldModStartProps {
    canUseRoomTool: boolean;
    canUseChatlog: boolean;
    canUseUserInfo: boolean;
    canUseTicketQueue: boolean;
    openIssueCount: number;
    /** Why the room tools are greyed while the moderator is in no room. */
    noRoomHint: string;
    /** The room the moderator is in (0: none). */
    roomId: number;
    selectedUser: StartPanelSelectedUser | null;
    onClearUser: () => void;
    searchQuery: string;
    searchPlaceholder: string;
    searchResults: HabboSearchResultData[] | null;
    noResultsText: string;
    onSearchQuery: (query: string) => void;
    onPickUser: (result: HabboSearchResultData) => void;
    onRoomTool: () => void;
    onChatlog: () => void;
    onUserInfo: () => void;
    onTicketQueue: () => void;
    /** The open tools, listed under the tiles: one goes to the front or is closed from here. */
    openPages?: HandheldModPageTab[];
    onOpenPage?: (id: string) => void;
    onClosePage?: (id: string) => void;
}

interface TileProps {
    icon: string;
    label: string;
    enabled: boolean;
    hint?: string;
    count?: number;
    testId: string;
    onClick: () => void;
}

const Tile: FC<TileProps> = ({ icon, label, enabled, hint, count = 0, testId, onClick }) => (
    <BaseButton className="octane-handheld-modtools__tile" data-testid={testId} disabled={!enabled} type="button" onClick={onClick}>
        <span className="octane-handheld-modtools__tile-icon">
            <img alt="" draggable={false} src={icon} />
        </span>
        <span className="octane-handheld-modtools__tile-text">
            <span className="octane-handheld-modtools__tile-label">{label}</span>
            {!enabled && hint && <span className="octane-handheld-modtools__tile-hint">{hint}</span>}
        </span>
        {count > 0 && <span className="octane-handheld-modtools__count">{count > 99 ? '99+' : count}</span>}
        {enabled && <HandheldModChevron />}
    </BaseButton>
);

/**
 * The start page: the user the moderator picked (in the room, or found by name), the search for one, and the four tools
 * of the desktop start panel as tiles, each greyed (and saying why) while it cannot be used, exactly when the desktop
 * buttons are.
 */
export const HandheldModStartView: FC<HandheldModStartProps> = (props) => {
    const { canUseRoomTool, canUseChatlog, canUseUserInfo, canUseTicketQueue, openIssueCount, noRoomHint, roomId, selectedUser, onClearUser } = props;
    const { searchQuery, searchPlaceholder, searchResults, noResultsText, onSearchQuery, onPickUser, onRoomTool, onChatlog, onUserInfo, onTicketQueue } = props;
    const { openPages = [], onOpenPage, onClosePage } = props;
    const showHead = !!selectedUser?.figure?.includes('hd-');

    return (
        <NativeTextTree>
            <div className="octane-handheld-modtools__start" data-testid="mod-start">
                <div className="octane-handheld-modtools__card octane-handheld-modtools__selected">
                    {selectedUser ? (
                        <>
                            <BaseButton className="octane-handheld-modtools__selected-user" data-testid="mod-selected-user" type="button" onClick={onUserInfo}>
                                <span className="octane-handheld-modtools__head">
                                    {showHead ? (
                                        <LayoutAvatarImageView
                                            compactHead
                                            compactHeadPadding={0}
                                            compactHeadSize={33}
                                            direction={2}
                                            figure={resolveAvatarFigure(selectedUser.figure, selectedUser.gender)}
                                            gender={resolveAvatarGender(selectedUser.gender)}
                                            headOnly
                                        />
                                    ) : (
                                        <img alt="" draggable={false} src={userIcon} />
                                    )}
                                    <span className={`octane-handheld-modtools__dot${selectedUser.present ? ' is-present' : ''}`} />
                                </span>
                                <span className="octane-handheld-modtools__selected-text">
                                    <span className="octane-handheld-modtools__selected-name">{selectedUser.username}</span>
                                    <span className="octane-handheld-modtools__selected-where">
                                        {selectedUser.present
                                            ? localizeWithFallback('octane.handheld.mod_tools.in_room', 'In your room')
                                            : localizeWithFallback('octane.handheld.mod_tools.not_in_room', 'Not in your room')}
                                    </span>
                                </span>
                            </BaseButton>
                            <BaseButton
                                aria-label={localizeWithFallback('octane.mod_tools.clear', 'Clear')}
                                className="octane-handheld-modtools__icon-button"
                                type="button"
                                onClick={onClearUser}
                            >
                                <HandheldModCross />
                            </BaseButton>
                        </>
                    ) : (
                        <span className="octane-handheld-modtools__selected-empty">
                            {localizeWithFallback('octane.handheld.mod_tools.no_user', 'Tap a user in the room or find one by name.')}
                        </span>
                    )}
                </div>
                <div className="octane-handheld-modtools__search">
                    <input
                        aria-label={searchPlaceholder}
                        className="octane-handheld-modtools__field"
                        placeholder={searchPlaceholder}
                        spellCheck={false}
                        type="text"
                        value={searchQuery}
                        onChange={(event) => onSearchQuery(event.target.value)}
                    />
                    {searchResults && (
                        <div className="octane-handheld-modtools__results" data-testid="mod-search-results">
                            {!searchResults.length && <HandheldModNote text={noResultsText} />}
                            {searchResults.slice(0, 12).map((result) => (
                                <BaseButton key={result.avatarId} className="octane-handheld-modtools__result" type="button" onClick={() => onPickUser(result)}>
                                    <span className={`octane-handheld-modtools__dot${result.isAvatarOnline ? ' is-present' : ''}`} />
                                    <span className="octane-handheld-modtools__result-name">{result.avatarName}</span>
                                </BaseButton>
                            ))}
                        </div>
                    )}
                </div>
                <div className="octane-handheld-modtools__room-line">
                    {roomId > 0 ? localizeWithFallback('octane.handheld.mod_tools.current_room', 'Room #%id%', ['id'], [String(roomId)]) : noRoomHint}
                </div>
                <div className="octane-handheld-modtools__tiles">
                    <Tile
                        enabled={canUseRoomTool}
                        hint={noRoomHint}
                        icon={roomToolIcon}
                        label={localizeWithFallback('octane.mod_tools.room_tool', 'Room tool')}
                        testId="mod-tile-room"
                        onClick={onRoomTool}
                    />
                    <Tile
                        enabled={canUseChatlog}
                        hint={noRoomHint}
                        icon={chatlogIcon}
                        label={localizeWithFallback('octane.handheld.mod_tools.room_chatlog', 'Room chatlog')}
                        testId="mod-tile-chatlog"
                        onClick={onChatlog}
                    />
                    <Tile
                        enabled={canUseUserInfo}
                        hint={localizeWithFallback('octane.handheld.mod_tools.pick_user', 'Pick a user first')}
                        icon={userIcon}
                        label={
                            selectedUser
                                ? localizeWithFallback(
                                      'octane.mod_tools.user_info_username',
                                      'User info: %username%',
                                      ['username'],
                                      [String(selectedUser.username)]
                                  )
                                : localizeWithFallback('octane.mod_tools.user_info', 'User Info')
                        }
                        testId="mod-tile-user"
                        onClick={onUserInfo}
                    />
                    <Tile
                        count={openIssueCount}
                        enabled={canUseTicketQueue}
                        icon={ticketIcon}
                        label={localizeWithFallback('octane.handheld.mod_tools.tickets', 'Tickets')}
                        testId="mod-tile-tickets"
                        onClick={onTicketQueue}
                    />
                </div>
                {openPages.length > 0 && (
                    <>
                        <HandheldModHeading text={localizeWithFallback('octane.handheld.mod_tools.open_tools', 'Open tools')} />
                        <div className="octane-handheld-modtools__open-list" data-testid="mod-open-pages">
                            {openPages.map((entry) => (
                                <div key={entry.id} className="octane-handheld-modtools__open">
                                    <BaseButton className="octane-handheld-modtools__open-name" type="button" onClick={() => onOpenPage(entry.id)}>
                                        <span>{entry.label}</span>
                                        <HandheldModChevron />
                                    </BaseButton>
                                    <BaseButton
                                        aria-label={`${localizeWithFallback('generic.close', 'Close')}: ${entry.label}`}
                                        className="octane-handheld-modtools__icon-button"
                                        type="button"
                                        onClick={() => onClosePage(entry.id)}
                                    >
                                        <HandheldModCross />
                                    </BaseButton>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </NativeTextTree>
    );
};

export interface HandheldModPageTab {
    id: string;
    label: string;
}

interface HandheldModToolsViewProps {
    start: HandheldModStartProps;
    /** The open tools, in the order they were opened. */
    pages: HandheldModPageTab[];
    activeId: string;
    sideBySide: boolean;
    onActivate: (id: string) => void;
    /** Closes one open tool (as its own close button does). */
    onClosePage: (id: string) => void;
    onClose: () => void;
    /** The tool pages (each in its HandheldModPageContext). */
    children?: ReactNode;
}

/**
 * The mod tools on a phone: one full-screen sheet instead of the desktop's start panel and its windows. The tabs are the
 * start page and every open tool (so a ticket, a user and a room can be switched between without losing any of them);
 * upright one page fills the sheet, on its side the start page stays on the left and the tool in front on the right.
 */
export const HandheldModToolsView: FC<HandheldModToolsViewProps> = ({
    start,
    pages,
    activeId,
    sideBySide,
    onActivate,
    onClosePage,
    onClose,
    children = null
}) => {
    const onStart = activeId === MOD_START_PAGE;
    const tabs = [{ id: MOD_START_PAGE, label: localizeWithFallback('octane.handheld.mod_tools.start', 'Start'), count: start.openIssueCount }, ...pages];

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="mod-tools">
                <HandheldSheetFrame
                    activeTab={activeId}
                    className="octane-handheld-modtools"
                    icon="icon-modtools"
                    tabs={tabs}
                    tabsLabel={localizeWithFallback('octane.handheld.mod_tools.open_tools', 'Open tools')}
                    title={localizeWithFallback('octane.handheld.mod_tools.title', 'Mod tools')}
                    onClose={onClose}
                    onTab={onActivate}
                >
                    <div className="octane-handheld-modtools__layout" data-page={onStart ? 'start' : 'tool'} data-side={sideBySide}>
                        <div className="octane-handheld-modtools__start-column" hidden={!sideBySide && !onStart}>
                            <HandheldModStartView {...start} openPages={pages} onClosePage={onClosePage} onOpenPage={onActivate} />
                        </div>
                        <div className="octane-handheld-modtools__pages" hidden={!sideBySide && onStart}>
                            {children}
                            {onStart && (
                                <HandheldModNote
                                    text={localizeWithFallback('octane.handheld.mod_tools.pick_tool', 'Open a tool on the left to see it here.')}
                                />
                            )}
                        </div>
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
