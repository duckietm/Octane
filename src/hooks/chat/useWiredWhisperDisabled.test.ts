import { describe, expect, it, vi } from 'vitest';

vi.mock('@octane/renderer', () => ({
    RoomSessionChatEvent: { CHAT_TYPE_SPEAK: 0, CHAT_TYPE_WHISPER: 1, CHAT_TYPE_SHOUT: 2 },
    OctaneLogger: { error: vi.fn(), warn: vi.fn() }
}));

vi.mock('@/state/useSharedHook', () => ({
    registerSharedHook: vi.fn(),
    useSharedHook: <T>(useSourceHook: () => T) => useSourceHook()
}));

vi.mock('../../api', () => ({
    LocalStorageKeys: { WIRED_WHISPER_DISABLED: 'wiredWhisperDisabled' },
    GetLocalStorage: () => undefined,
    SetLocalStorage: vi.fn()
}));

import { isWiredWhisper, WIRED_CHAT_STYLE_ID } from './useWiredWhisperDisabled';

describe('isWiredWhisper', () => {
    it('recognises a whisper carrying the wired bubble style', () => {
        expect(isWiredWhisper(1, WIRED_CHAT_STYLE_ID)).toBe(true);
    });

    it('keeps whispers from people and wired messages that are not whispers', () => {
        expect(isWiredWhisper(1, 0)).toBe(false);
        expect(isWiredWhisper(0, WIRED_CHAT_STYLE_ID)).toBe(false);
        expect(isWiredWhisper(2, WIRED_CHAT_STYLE_ID)).toBe(false);
    });
});
