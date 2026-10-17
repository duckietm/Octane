import { HabboSearchResultData } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { LayoutAvatarImageView } from '../../../common';
import { DraggableWindow } from '../../../common/draggable-window';
import { NativeText } from '../../../common/native-text/NativeText';
import { resolveAvatarFigure } from '../../friends/views/friends-list/resolveAvatarFigure';
import { resolveAvatarGender } from '../../friends/views/friends-list/resolveAvatarGender';
import { nativeNumber, parseNativeLayout } from '../native/NativeLayout';
import { NativeFrameView, NativeNodeHandlers, NativeNodeStates } from '../native/NativeLayoutView';
import startPanelXml from '../../../assets/mod-tools/xml/start_panel.xml?raw';
import roomToolIcon from '../../../assets/mod-tools/images/roomtools_history_open_icon.png';
import chatlogIcon from '../../../assets/mod-tools/images/roomtools_chat_history.png';
import userIcon from '../../../assets/mod-tools/images/placeholder_avatar_small_head_cropped_png.png';
import ticketIcon from '../../../assets/mod-tools/images/tools_file_icon.png';
import { BaseButton } from '../../../common/BaseButton';

const IMAGES: Record<string, string> = {
    roomtools_history_open_icon: roomToolIcon,
    roomtools_chat_history: chatlogIcon,
    placeholder_avatar_small_head_cropped_png: userIcon,
    tools_file_icon: ticketIcon
};
// a fully transparent pixel stands in for the placeholder head while the selected user's own head is drawn over it
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** The search row added under the four tool buttons: the frame grows by this much. */
const SEARCH_ROW = 26;
const SEARCH_TOP = 140;
const RESULT_HEIGHT = 16;

export interface StartPanelSelectedUser {
    userId: number;
    username: string;
    figure?: string;
    gender?: string | number;
    /** The user is in the room the moderator is in. */
    present: boolean;
}

export interface StartPanelProps {
    canUseRoomTool: boolean;
    canUseChatlog: boolean;
    canUseUserInfo: boolean;
    canUseTicketQueue: boolean;
    userCaption: string;
    /** Open issues not picked by anyone yet: shown after the ticket browser caption. */
    openIssueCount: number;
    /** Tooltip of the room buttons while the moderator is in no room. */
    noRoomHint?: string;
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
    onClose: () => void;
    /** The start panel frame (the tracker's parent geometry): where it is shown and where a drag leaves it. */
    x: number;
    y: number;
    onMove: (x: number, y: number) => void;
}

const DISABLED = 0x666666;

/**
 * AIR StartPanelCtrl (start_panel): room tool, room chatlog, user info and ticket browser regions, each greyed while it cannot be used. Kept from the
 * earlier mod tools and placed inside the frame: the selected user's head replaces the placeholder head (with a dot while the user is in the room and a
 * clear cross), the open issue count follows the ticket browser caption, and a row under the buttons finds a user by name.
 */
export const StartPanelView: FC<StartPanelProps> = (props) => {
    const {
        canUseRoomTool, canUseChatlog, canUseUserInfo, canUseTicketQueue, userCaption, openIssueCount, noRoomHint, selectedUser, onClearUser,
        searchQuery, searchPlaceholder, searchResults, noResultsText, onSearchQuery, onPickUser,
        onRoomTool, onChatlog, onUserInfo, onTicketQueue, onClose, x, y, onMove
    } = props;
    const node = useMemo(() => parseNativeLayout(startPanelXml), []);
    const showHead = !!selectedUser?.figure?.includes('hd-');
    // a disabled button greys its label (0x666666), an enabled one is black
    const labelColor = (enabled: boolean) => (enabled ? 0 : DISABLED);
    const states: NativeNodeStates = {
        room_tool_but: { enabled: canUseRoomTool, title: canUseRoomTool ? undefined : noRoomHint },
        chatlog_but: { enabled: canUseChatlog, title: canUseChatlog ? undefined : noRoomHint },
        userinfo_but: { enabled: canUseUserInfo },
        ticket_queue_but: { enabled: canUseTicketQueue },
        'room_tool_but/offence_name': { textColor: labelColor(canUseRoomTool) },
        'chatlog_but/offence_name': { textColor: labelColor(canUseChatlog) },
        'userinfo_but/offence_name': { textColor: labelColor(canUseUserInfo), caption: userCaption },
        'ticket_queue_but/offence_name': { textColor: labelColor(canUseTicketQueue), caption: openIssueCount > 0 ? `Ticket browser (${openIssueCount > 99 ? '99+' : openIssueCount})` : undefined }
    };
    const handlers: NativeNodeHandlers = { room_tool_but: { onClick: onRoomTool }, chatlog_but: { onClick: onChatlog }, userinfo_but: { onClick: onUserInfo }, ticket_queue_but: { onClick: onTicketQueue } };
    const images = showHead ? { ...IMAGES, placeholder_avatar_small_head_cropped_png: BLANK } : IMAGES;
    // the user region sits at (0, 60) of the item list, which is at (0, 10) of the client area
    const userTop = 10 + 60;

    return (
        <DraggableWindow handleSelector=".native-frame__titlebar" initialPosition={{ x, y }} onPositionChange={(position) => onMove(position.x, position.y)} unconstrainedPosition>
            <NativeFrameView handlers={handlers} height={nativeNumber(node, 'height') + SEARCH_ROW} images={images} node={node} states={states} onClose={onClose}>
                {showHead && (
                    <div className="native-start-panel__head" style={{ left: 5, top: userTop + 4 }}>
                        <LayoutAvatarImageView compactHead compactHeadPadding={0} compactHeadSize={20} direction={2} figure={resolveAvatarFigure(selectedUser.figure, selectedUser.gender)} gender={resolveAvatarGender(selectedUser.gender)} headOnly />
                    </div>
                )}
                {selectedUser && <span className={`native-start-panel__presence${selectedUser.present ? ' is-present' : ''}`} style={{ left: 20, top: userTop + 19 }} />}
                {selectedUser && (
                    <BaseButton aria-label="Clear" className="native-start-panel__clear" style={{ left: 141, top: userTop + 9 }} type="button" onClick={onClearUser}>
                        ×
                    </BaseButton>
                )}
                <div className="native-start-panel__search" style={{ left: 0, top: SEARCH_TOP, width: 155 }}>
                    <input placeholder={searchPlaceholder} spellCheck={false} type="text" value={searchQuery} onChange={(event) => onSearchQuery(event.target.value)} />
                    {searchResults && (
                        <div className="native-start-panel__results" style={{ height: Math.max(1, Math.min(searchResults.length, 12)) * RESULT_HEIGHT + 4 }}>
                            {!searchResults.length && (
                                <div className="native-start-panel__result is-empty" style={{ top: 2 }}>
                                    <NativeText background={0xffffff} overrides={{ color: 0x666666 }} text={noResultsText} textStyle="il_regular" />
                                </div>
                            )}
                            {searchResults.slice(0, 12).map((result, index) => (
                                <BaseButton type="button" key={result.avatarId} className="native-start-panel__result" style={{ top: 2 + index * RESULT_HEIGHT }} onClick={() => onPickUser(result)}>
                                    <span className={`native-start-panel__presence${result.isAvatarOnline ? ' is-present' : ''}`} style={{ left: 3, top: 5 }} />
                                    <div style={{ position: 'absolute', left: 12, top: 1 }}>
                                        <NativeText background={0xffffff} text={result.avatarName} textStyle="il_regular" />
                                    </div>
                                </BaseButton>
                            ))}
                        </div>
                    )}
                </div>
            </NativeFrameView>
        </DraggableWindow>
    );
};
