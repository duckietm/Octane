import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent = vi.hoisted(() => [] as unknown[]);
const settingsHandlers = vi.hoisted(() => [] as ((event: unknown) => void)[]);

vi.mock('@octane/renderer', () => ({
    RoomSessionChatEvent: { CHAT_TYPE_SPEAK: 0, CHAT_TYPE_WHISPER: 1, CHAT_TYPE_SHOUT: 2 },
    UserSettingsEvent: class UserSettingsEvent {},
    WiredMenuSettingsComposer: class WiredMenuSettingsComposer {
        public data: unknown[];

        constructor(...data: unknown[]) {
            this.data = data;
        }
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
    LocalStorageKeys: { WIRED_WHISPER_DISABLED: 'wiredWhisperDisabled' },
    GetLocalStorage: () => undefined,
    SetLocalStorage: vi.fn(),
    SendMessageComposer: (composer: unknown) => sent.push(composer)
}));

import { composeWiredWhisperPreference, isWiredWhisper, useWiredWhisperDisabled, WIRED_CHAT_STYLE_ID } from './useWiredWhisperDisabled';

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

describe('useWiredWhisperDisabled', () => {
    beforeEach(() => {
        sent.length = 0;
        settingsHandlers.length = 0;
    });

    it('places the switch in the wired-whisper slot of the official wired menu preferences', () => {
        expect((composeWiredWhisperPreference(true) as unknown as { data: unknown[] }).data).toEqual([false, false, false, true, false, '']);
    });

    it('sends the wired menu preferences when the switch changes', () => {
        const { result } = renderHook(() => useWiredWhisperDisabled());

        expect(result.current[0]).toBe(false);

        act(() => result.current[1](true));

        expect(result.current[0]).toBe(true);
        expect(sent).toHaveLength(1);
        expect((sent[0] as { data: unknown[] }).data[3]).toBe(true);
    });

    it('takes the value from the user settings packet without echoing it back', () => {
        const { result } = renderHook(() => useWiredWhisperDisabled());

        act(() => settingsHandlers.at(-1)?.({ getParser: () => ({ wiredWhisperDisabled: true }) }));

        expect(result.current[0]).toBe(true);
        expect(sent).toEqual([]);
    });
});
