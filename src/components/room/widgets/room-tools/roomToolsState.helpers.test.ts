import { describe, expect, it } from 'vitest';
import { ROOM_TOOL_HELP_BUBBLE_NAMES, ROOM_TOOLS_EXPANDED_UI_FLAG, resolveRoomToolsCollapsed } from './roomToolsState.helpers';

describe('room tools collapse state (RoomToolsWidget.as:49)', () => {
    it('forces the rail collapsed for new users', () => {
        expect(resolveRoomToolsCollapsed({ storedCollapsed: false, uiFlags: ROOM_TOOLS_EXPANDED_UI_FLAG, isNoob: true })).toBe(true);
    });

    it('seeds the first visit from the server uiFlags bit 2', () => {
        expect(resolveRoomToolsCollapsed({ storedCollapsed: null, uiFlags: 0, isNoob: false })).toBe(true);
        expect(resolveRoomToolsCollapsed({ storedCollapsed: null, uiFlags: ROOM_TOOLS_EXPANDED_UI_FLAG, isNoob: false })).toBe(false);
        expect(resolveRoomToolsCollapsed({ storedCollapsed: null, uiFlags: 1 | ROOM_TOOLS_EXPANDED_UI_FLAG, isNoob: false })).toBe(false);
    });

    it('keeps the browser choice once the user toggled the rail here', () => {
        expect(resolveRoomToolsCollapsed({ storedCollapsed: false, uiFlags: 0, isNoob: false })).toBe(false);
        expect(resolveRoomToolsCollapsed({ storedCollapsed: true, uiFlags: ROOM_TOOLS_EXPANDED_UI_FLAG, isNoob: false })).toBe(true);
    });

    it('exposes the official room_tools_toolbar element names as help bubble anchors', () => {
        expect(ROOM_TOOL_HELP_BUBBLE_NAMES.chat_history).toBe('button_chat_history');
        expect(ROOM_TOOL_HELP_BUBBLE_NAMES.like_room).toBe('button_like');
        expect(ROOM_TOOL_HELP_BUBBLE_NAMES.camera).toBe('button_camera');
        expect(ROOM_TOOL_HELP_BUBBLE_NAMES.room_history_back).toBe('button_history_back');
        expect(ROOM_TOOL_HELP_BUBBLE_NAMES.room_history_next).toBe('button_history_forward');
    });
});
