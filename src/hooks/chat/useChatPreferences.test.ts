import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, unknown>());

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
    OctaneLogger: { error: vi.fn(), warn: vi.fn() }
}));

vi.mock('@/state/useSharedHook', () => ({
    registerSharedHook: vi.fn(),
    useSharedHook: <T>(useSourceHook: () => T) => useSourceHook()
}));

vi.mock('../../api', () => ({
    LocalStorageKeys: { CHAT_PREFERENCES: 'chatPreferences' },
    GetLocalStorage: (key: string) => storage.get(key),
    SetLocalStorage: (key: string, value: unknown) => storage.set(key, value)
}));

import { DEFAULT_CHAT_PREFERENCES, resolveEffectiveChatSettings, sanitizeChatPreferences, useChatPreferences } from './useChatPreferences';

const roomSettings = { mode: 1, weight: 0, speed: 2, distance: 12, protection: 2 };

describe('chat preferences', () => {
    beforeEach(() => {
        storage.clear();
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

    it('persists a partial update merged with the current preferences', () => {
        const { result } = renderHook(() => useChatPreferences());

        expect(result.current[0]).toEqual(DEFAULT_CHAT_PREFERENCES);

        act(() => result.current[1]({ bubbleWidth: 2 }));
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current[0]).toEqual({ mode: 0, bubbleWidth: 2, scrollSpeed: 1 });
        expect(storage.get('chatPreferences')).toEqual({ mode: 0, bubbleWidth: 2, scrollSpeed: 1 });
    });

    it('sanitizes what it reads back from storage', () => {
        storage.set('chatPreferences', { mode: 1, bubbleWidth: 9, scrollSpeed: 2 });

        const { result } = renderHook(() => useChatPreferences());

        expect(result.current[0]).toEqual({ mode: 1, bubbleWidth: 1, scrollSpeed: 2 });
    });
});
