/**
 * Official `RoomToolsWidget.as:49`: `setCollapsed(isNoob || !(uiFlags & 2))` - the tools stay
 * collapsed for new users and otherwise follow the "room tools expanded" flag of the account
 * preferences (`UserSettings.flags`, bit 2, written back through header 2313).
 */
export const ROOM_TOOLS_EXPANDED_UI_FLAG = 2;

export interface RoomToolsCollapseInput {
    // Browser-stored choice; `null` when the user never toggled the rail on this client.
    storedCollapsed: boolean | null;
    uiFlags: number;
    isNoob: boolean;
}

/**
 * The toggle is written back through `UpdateUIFlags` (header 2313), as the official
 * `SessionDataManager.setRoomToolsState` does. The browser copy still wins locally so the rail
 * keeps its state before the next user object arrives.
 */
export const resolveRoomToolsCollapsed = ({ storedCollapsed, uiFlags, isNoob }: RoomToolsCollapseInput): boolean => {
    if (isNoob) return true;

    if (storedCollapsed !== null) return storedCollapsed;

    return (uiFlags & ROOM_TOOLS_EXPANDED_UI_FLAG) === 0;
};

// Official `room_tools_toolbar` element names, the anchors `UiHelpBubblesWidget` looks up
// through `RoomToolsWidget.getIconLocation`.
export const ROOM_TOOL_HELP_BUBBLE_NAMES: Readonly<Record<string, string>> = Object.freeze({
    settings: 'button_settings',
    chat_history: 'button_chat_history',
    like_room: 'button_like',
    achievements: 'button_achievements',
    camera: 'button_camera',
    room_history: 'button_history',
    room_history_back: 'button_history_back',
    room_history_next: 'button_history_forward'
});
