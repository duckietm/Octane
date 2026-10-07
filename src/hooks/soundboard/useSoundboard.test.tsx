/* @vitest-environment jsdom */

import { SoundboardPlayDeniedEvent, SoundboardPlayEvent, SoundboardSettingsEvent } from '@octane/renderer';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBubbleType } from '../../api/notification/NotificationBubbleType';
import { useSoundboardState } from './useSoundboard';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: any) => void>(),
    playSoundboard: vi.fn().mockResolvedValue(true),
    stopSoundboard: vi.fn(),
    sendMessage: vi.fn(),
    showSingleBubble: vi.fn(),
    loadGamedata: vi.fn().mockResolvedValue({}),
    manifest: { categories: [] as unknown[], byClassname: new Map<string, unknown>() }
}));

vi.mock('@octane/renderer', () => {
    class OctaneEvent {
        constructor(public type: string) {}
    }
    class SoundboardPlayComposer {
        constructor(public id: number) {}
    }
    class SoundboardRequestSettingsComposer {}
    class SoundboardSetEnabledComposer {
        constructor(public enabled: boolean) {}
    }
    class SoundboardPlayEvent {}
    class SoundboardPlayDeniedEvent {}
    class SoundboardSettingsEvent {}

    return {
        GetSessionDataManager: () => ({ getUserDataSnapshot: () => ({ userId: 42 }) }),
        GetSoundManager: () => ({ playSoundboard: mocks.playSoundboard, stopSoundboard: mocks.stopSoundboard }),
        loadGamedata: mocks.loadGamedata,
        OctaneEvent,
        SoundboardPlayComposer,
        SoundboardRequestSettingsComposer,
        SoundboardSetEnabledComposer,
        SoundboardPlayEvent,
        SoundboardPlayDeniedEvent,
        SoundboardSettingsEvent
    };
});

vi.mock('../../api', () => ({
    DispatchUiEvent: vi.fn(),
    GetConfigurationValue: vi.fn().mockReturnValue(''),
    LocalizeText: (key: string, names?: string[], values?: string[]) => `${key}:${values?.join(',') ?? ''}`,
    NotificationBubbleType: { SOUNDBOARD: 'soundboard' },
    SendMessageComposer: mocks.sendMessage,
    setSoundboardRoomEnabled: vi.fn()
}));

// The manifest is its own shared source; this suite renders the soundboard
// hook directly, without a SharedHookRegistry host to mount it.
vi.mock('./useSoundboardManifest', () => ({
    useSoundboardManifest: () => ({ manifest: mocks.manifest, manifestRef: { current: mocks.manifest }, classnames: [], loaded: true })
}));

vi.mock('../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: any) => void) => mocks.handlers.set(type, handler)
}));

vi.mock('../notification', () => ({
    useNotificationActions: () => ({ showSingleBubble: mocks.showSingleBubble })
}));

describe('useSoundboardState', () => {
    beforeEach(() => {
        mocks.handlers.clear();
        mocks.playSoundboard.mockClear();
        mocks.stopSoundboard.mockClear();
        mocks.sendMessage.mockClear();
        mocks.showSingleBubble.mockClear();
        mocks.loadGamedata.mockReset();
        mocks.loadGamedata.mockResolvedValue({});
    });

    it('blocks a locally known cooldown and shows one personal bubble', () => {
        const { result } = renderHook(() => useSoundboardState());

        act(() =>
            mocks.handlers.get(SoundboardSettingsEvent)?.({
                getParser: () => ({ enabled: true, cooldownSeconds: 30, sounds: [] })
            })
        );
        act(() =>
            mocks.handlers.get(SoundboardPlayDeniedEvent)?.({
                getParser: () => ({ reason: 1, remainingSeconds: 12 })
            })
        );
        act(() => result.current.play({ id: 7 } as any));

        expect(result.current.isCoolingDown).toBe(true);
        expect(mocks.sendMessage).not.toHaveBeenCalled();
        expect(mocks.showSingleBubble).toHaveBeenCalledWith(expect.stringContaining('12'), NotificationBubbleType.SOUNDBOARD);
    });

    it('sends refresh and play composers when allowed', () => {
        const { result } = renderHook(() => useSoundboardState());

        act(() => result.current.refresh());
        act(() => result.current.play({ id: 7 } as any));

        expect(mocks.sendMessage).toHaveBeenCalledTimes(2);
        expect((mocks.sendMessage.mock.calls[1][0] as any).id).toBe(7);
    });

    it('keeps the JSON and JSONC catalog fallback local-only', async () => {
        mocks.loadGamedata.mockImplementation(async (url: string) =>
            url.includes('layout')
                ? {}
                : {
                      sounds: [{ id: 11, name: 'Local click', url: 'sounds/soundboard/click.ogg' }]
                  }
        );
        const { result } = renderHook(() => useSoundboardState());

        act(() =>
            mocks.handlers.get(SoundboardSettingsEvent)?.({
                getParser: () => ({ enabled: true, cooldownSeconds: 30, sounds: [] })
            })
        );

        await waitFor(() => expect(result.current.sounds).toEqual([expect.objectContaining({ id: 11, name: 'Local click', local: true })]));
        act(() => result.current.play(result.current.sounds[0]));

        expect(mocks.playSoundboard).toHaveBeenCalledWith('sounds/soundboard/click.ogg', { gain: 1 });
        expect(mocks.sendMessage).toHaveBeenCalledTimes(0);
    });

    describe('a play announced by the server', () => {
        const announce = (classname: string) =>
            act(() =>
                mocks.handlers.get(SoundboardPlayEvent)?.({
                    getParser: () => ({ soundId: 3, classname, url: '', soundName: 'Bell', username: 'tester', actorUserId: 7, actorRoomIndex: 1 })
                })
            );

        beforeEach(() => mocks.manifest.byClassname.clear());

        it('plays a pad with the group and the gain its manifest entry carries', () => {
            mocks.manifest.byClassname.set('bell', { classname: 'bell', name: 'Bell', file: 'bell.ogg', group: 'bells', gain: 0.5 });
            renderHook(() => useSoundboardState());

            announce('bell');

            expect(mocks.playSoundboard).toHaveBeenCalledWith(expect.stringContaining('bell.ogg'), { group: 'bells', gain: 0.5 });
        });

        it('plays a pad the manifest does not know without options', () => {
            renderHook(() => useSoundboardState());

            announce('unknown');

            expect(mocks.playSoundboard).toHaveBeenCalledWith(expect.any(String), undefined);
        });
    });
});
