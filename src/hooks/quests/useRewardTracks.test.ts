/* @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    bubble: vi.fn(),
    handlers: new Map<unknown, (event: unknown) => void>()
}));

vi.mock('@/state/useSharedHook', () => ({
    registerSharedHook: () => undefined,
    useSharedHook: (hook: () => unknown) => hook()
}));
vi.mock('../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => {
        mocks.handlers.set(type, handler);
    }
}));
vi.mock('../notification', () => ({ useNotification: () => ({ showSingleBubble: mocks.bubble, simpleAlert: vi.fn() }) }));

import { useRewardTracks } from './useRewardTracks';

const dispatch = async (type: unknown, parser: Record<string, unknown>) => {
    await act(async () => {
        mocks.handlers.get(type)({ getParser: () => parser });
    });
};

const fakeTrack = () => {
    const claimed = new Set<string>();

    return {
        id: 'intro',
        claimed,
        getPrize: (id: string) => ({ id, premium: false }),
        markPrizeClaimed: (id: string) => claimed.add(id),
        get claimablePrizeCount() {
            return claimed.has('p1') ? 0 : 1;
        }
    };
};

afterEach(() => {
    cleanup();
    mocks.bubble.mockClear();
    mocks.handlers.clear();
});

describe('useRewardTracks claim result', () => {
    it('marks the prize claimed and shows one bubble outside the state update', async () => {
        const { RewardTracksMessageEvent, RewardTrackClaimResultMessageEvent } = await import('@octane/renderer');
        const track = fakeTrack();
        const { result } = renderHook(() => useRewardTracks(), { wrapper: StrictMode });

        await dispatch(RewardTracksMessageEvent, { disabled: false, reload: false, tracks: [ track ] });
        expect(result.current.unseenCount).toBe(1);

        mocks.bubble.mockClear();
        await dispatch(RewardTrackClaimResultMessageEvent, { trackId: 'intro', rewardId: 'p1', resultCode: 0 });

        expect(track.claimed.has('p1')).toBe(true);
        expect(result.current.unseenCount).toBe(0);
        expect(mocks.bubble).toHaveBeenCalledTimes(1);
        expect(mocks.bubble.mock.calls[0][3]).toBe('reward_track/open/intro');
    });

    it('shows nothing for a track it does not know', async () => {
        const { RewardTrackClaimResultMessageEvent } = await import('@octane/renderer');

        renderHook(() => useRewardTracks());
        await dispatch(RewardTrackClaimResultMessageEvent, { trackId: 'other', rewardId: 'p1', resultCode: 0 });

        expect(mocks.bubble).not.toHaveBeenCalled();
    });
});
