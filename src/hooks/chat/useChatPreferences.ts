import { RoomChatSettings } from '@octane/renderer';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { IRoomChatSettings, LocalStorageKeys } from '../../api';
import { useLocalStorage } from '../useLocalStorage';

/**
 * The three chat preferences the official client keeps per user (ChatSettingsView): how bubbles
 * flow, how wide they are and how fast they drift. The values are the RoomChatSettings constants
 * so they can replace the room-level fields directly.
 */
export interface ChatPreferences {
    mode: number;
    bubbleWidth: number;
    scrollSpeed: number;
}

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
    mode: RoomChatSettings.CHAT_MODE_FREE_FLOW,
    bubbleWidth: RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL,
    scrollSpeed: RoomChatSettings.CHAT_SCROLL_SPEED_NORMAL
};

const pickKnownValue = (value: unknown, known: number[], fallback: number): number => (typeof value === 'number' && known.includes(value) ? value : fallback);

// The official client sanitizes each value before storing it: an unknown mode falls back to free
// flow, an unknown width or speed falls back to normal.
export const sanitizeChatPreferences = (value: Partial<ChatPreferences> | null | undefined): ChatPreferences => ({
    mode: pickKnownValue(value?.mode, [RoomChatSettings.CHAT_MODE_FREE_FLOW, RoomChatSettings.CHAT_MODE_LINE_BY_LINE], DEFAULT_CHAT_PREFERENCES.mode),
    bubbleWidth: pickKnownValue(
        value?.bubbleWidth,
        [RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE, RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL, RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN],
        DEFAULT_CHAT_PREFERENCES.bubbleWidth
    ),
    scrollSpeed: pickKnownValue(
        value?.scrollSpeed,
        [RoomChatSettings.CHAT_SCROLL_SPEED_FAST, RoomChatSettings.CHAT_SCROLL_SPEED_NORMAL, RoomChatSettings.CHAT_SCROLL_SPEED_SLOW],
        DEFAULT_CHAT_PREFERENCES.scrollSpeed
    )
});

/**
 * The settings the chat widget actually renders with. The official client builds them from the
 * user's own mode, width and speed and only takes the flood sensitivity from the room, so a room
 * owner's choice never overrides what the user picked for themselves.
 */
export const resolveEffectiveChatSettings = (roomSettings: IRoomChatSettings, preferences: ChatPreferences): IRoomChatSettings => {
    const safePreferences = sanitizeChatPreferences(preferences);

    return {
        mode: safePreferences.mode,
        weight: safePreferences.bubbleWidth,
        speed: safePreferences.scrollSpeed,
        distance: roomSettings.distance,
        protection: roomSettings.protection
    };
};

const useChatPreferencesState = () => {
    const [storedValue, setStoredValue] = useLocalStorage<ChatPreferences>(LocalStorageKeys.CHAT_PREFERENCES, DEFAULT_CHAT_PREFERENCES);
    const preferences = sanitizeChatPreferences(storedValue);
    const setPreferences = (update: Partial<ChatPreferences>) => setStoredValue(sanitizeChatPreferences({ ...preferences, ...update }));

    return [preferences, setPreferences] as const;
};

export const useChatPreferences = () => useSharedHook(useChatPreferencesState);

registerSharedHook(useChatPreferencesState);
