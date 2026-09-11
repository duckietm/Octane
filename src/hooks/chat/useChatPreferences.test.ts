import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, unknown>());
const sent = vi.hoisted(() => [] as unknown[]);
const settingsHandlers = vi.hoisted(() => [] as ((event: unknown) => void)[]);

vi.mock('@octane/renderer', () => ({
    RoomChatSettings: {
        CHAT_MODE_FREE_FLOW: 0,
        CHAT_MODE_LINE_BY_LINE: 1,
        CHAT_BUBBLE_WIDTH_WIDE: 0,
        CHAT_BUBBLE_WIDTH_NORMAL: 1,
        CHAT_BUBBLE_WIDTH_THIN: 2,
        CHAT_SCROLL_SPEED_FAST: 0,
        CHAT_SCROLL_SPEED_NORMAL: 1,
        CHAT_SCROLL_SPEED_SLOW: 2
    },
    UserSettingsEvent: class UserSettingsEvent {},
    UserSettingsChatPreferencesComposer: class UserSettingsChatPreferencesComposer {
        constructor(
            public chatMode: number,
            public chatBubbleWidth: number,
            public chatScrollSpeed: number
        ) {}
    },
    OctaneLogger: { error: vi.fn(), warn: vi.fn() }
}));

vi.mock('@/state/useSharedHook', () => ({
    registerSharedHook: vi.fn(),
    useSharedHook: <T>(useSourceHook: () => T) => useSourceHook()
}));

vi.mock('../events', () => ({
    useMessageEvent: (_eventType: unknown, handler: (event: unknown) => void) => {
        settingsHandlers.push(handler);
    }
}));

vi.mock('../../api', () => ({
    LocalStorageKeys: { CHAT_PREFERENCES: 'chatPreferences' },
    GetLocalStorage: (key: string) => storage.get(key),
    SetLocalStorage: (key: string, value: unknown) => storage.set(key, value),
    SendMessageComposer: (composer: unknown) => sent.push(composer)
}));

import {
    areChatPreferencesEqual,
    DEFAULT_CHAT_PREFERENCES,
    resolveEffectiveChatSettings,
    sanitizeChatPreferences,
    useChatPreferences
} from './useChatPreferences';

const roomSettings = { mode: 1, weight: 0, speed: 2, distance: 12, protection: 2 };

const userSettingsEvent = (chatMode: number, chatBubbleWidth: number, chatScrollSpeed: number) => ({
    getParser: () => ({ chatMode, chatBubbleWidth, chatScrollSpeed })
});

describe('chat preferences', () => {
    beforeEach(() => {
        storage.clear();
        sent.length = 0;
        settingsHandlers.length = 0;
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('falls back to free flow, normal width and normal speed for unknown values', () => {
        expect(sanitizeChatPreferences(null)).toEqual(DEFAULT_CHAT_PREFERENCES);
        expect(sanitizeChatPreferences({ mode: 7, bubbleWidth: -1, scrollSpeed: 'slow' as unknown as number })).toEqual(DEFAULT_CHAT_PREFERENCES);
        expect(sanitizeChatPreferences({ mode: 1, bubbleWidth: 2, scrollSpeed: 0 })).toEqual({ mode: 1, bubbleWidth: 2, scrollSpeed: 0 });
    });

    it('lets the user preferences replace the room mode, width and speed but keeps the room distance and flood protection', () => {
        expect(resolveEffectiveChatSettings(roomSettings, { mode: 0, bubbleWidth: 2, scrollSpeed: 0 })).toEqual({
            mode: 0,
            weight: 2,
            speed: 0,
            distance: 12,
            protection: 2
        });
    });

    it('compares the three values', () => {
        expect(areChatPreferencesEqual({ mode: 0, bubbleWidth: 1, scrollSpeed: 1 }, DEFAULT_CHAT_PREFERENCES)).toBe(true);
        expect(areChatPreferencesEqual({ mode: 0, bubbleWidth: 2, scrollSpeed: 1 }, DEFAULT_CHAT_PREFERENCES)).toBe(false);
    });

    it('persists a partial update merged with the current preferences and sends it to the server', () => {
        const { result } = renderHook(() => useChatPreferences());

        expect(result.current[0]).toEqual(DEFAULT_CHAT_PREFERENCES);

        act(() => result.current[1]({ bubbleWidth: 2 }));
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current[0]).toEqual({ mode: 0, bubbleWidth: 2, scrollSpeed: 1 });
        expect(storage.get('chatPreferences')).toEqual({ mode: 0, bubbleWidth: 2, scrollSpeed: 1 });
        expect(sent).toEqual([{ chatMode: 0, chatBubbleWidth: 2, chatScrollSpeed: 1 }]);
    });

    it('does not send anything when the update changes nothing', () => {
        const { result } = renderHook(() => useChatPreferences());

        act(() => result.current[1]({ mode: 0 }));

        expect(sent).toEqual([]);
    });

    it('sanitizes what it reads back from storage', () => {
        storage.set('chatPreferences', { mode: 1, bubbleWidth: 9, scrollSpeed: 2 });

        const { result } = renderHook(() => useChatPreferences());

        expect(result.current[0]).toEqual({ mode: 1, bubbleWidth: 1, scrollSpeed: 2 });
    });

    it('adopts the server values from the user settings packet over the local fallback', () => {
        storage.set('chatPreferences', { mode: 1, bubbleWidth: 2, scrollSpeed: 2 });

        const { result } = renderHook(() => useChatPreferences());

        expect(result.current[0]).toEqual({ mode: 1, bubbleWidth: 2, scrollSpeed: 2 });

        act(() => settingsHandlers.at(-1)?.(userSettingsEvent(0, 0, 9)));
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current[0]).toEqual({ mode: 0, bubbleWidth: 0, scrollSpeed: 1 });
        expect(storage.get('chatPreferences')).toEqual({ mode: 0, bubbleWidth: 0, scrollSpeed: 1 });
        expect(sent).toEqual([]);
    });
});
