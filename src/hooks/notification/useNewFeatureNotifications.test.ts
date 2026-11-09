/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { CreateLinkEvent, GetCommunication } from '@octane/renderer';
import { mockEventDispatcher } from '../../octane-renderer.mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNewFeatureNotifications } from './useNewFeatureNotifications';

const mocks = vi.hoisted(() => ({ tracks: [] as { id: string; complete: boolean }[] }));

vi.mock('../quests/useRewardTracks', () => ({ useRewardTracks: () => ({ tracks: mocks.tracks }) }));

const PROPERTIES: Record<string, string> = {
    'notifications.new_feature.active': 'rewardtrack_intro',
    'notifications.new_feature.condition.rewardtrack_intro': 'reward_track_incomplete:introduction',
    'notifications.new_feature.image.rewardtrack_intro': 'reward_track_small_icon',
    'notifications.new_feature.internal_link.rewardtrack_intro': 'reward_track/open/introduction'
};

let properties: Record<string, string> = PROPERTIES;
const property = (key: string) => properties[key] ?? '';

const secondsUntil = (timeStr: string, seconds: number) =>
    act(() => mockEventDispatcher.dispatchEvent({ type: 'SecondsUntilMessageEvent', getParser: () => ({ timeStr, secondsUntil: seconds }) } as never));

beforeEach(() => {
    vi.useFakeTimers();
    properties = PROPERTIES;
    mocks.tracks = [];
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('useNewFeatureNotifications', () => {
    it('shows the reward track notification 2 s after start while the track is incomplete', () => {
        mocks.tracks = [{ id: 'introduction', complete: false }];
        const { result } = renderHook(() => useNewFeatureNotifications(property));

        act(() => vi.advanceTimersByTime(1999));
        expect(result.current.notifications).toHaveLength(0);
        act(() => vi.advanceTimersByTime(1));
        expect(result.current.notifications).toHaveLength(1);
        expect(result.current.notifications[0].config.image).toBe('reward_track_small_icon');
        expect(result.current.notifications[0].cancelVisible).toBe(true);

        act(() => result.current.open('rewardtrack_intro'));
        expect(CreateLinkEvent).toHaveBeenCalledWith('reward_track/open/introduction');

        act(() => result.current.dismiss('rewardtrack_intro'));
        expect(result.current.notifications).toHaveLength(0);
    });

    it('never shows it once the track is complete', () => {
        mocks.tracks = [{ id: 'introduction', complete: true }];
        const { result } = renderHook(() => useNewFeatureNotifications(property));

        act(() => vi.advanceTimersByTime(20000));
        expect(result.current.notifications).toHaveLength(0);
    });

    it('retries 3 times, 2 s apart, until the tracks arrive', () => {
        const { result, rerender } = renderHook(() => useNewFeatureNotifications(property));

        act(() => vi.advanceTimersByTime(6000));
        expect(result.current.notifications).toHaveLength(0);

        // Third retry at 8 s.
        mocks.tracks = [{ id: 'introduction', complete: false }];
        rerender();
        act(() => vi.advanceTimersByTime(2000));
        expect(result.current.notifications).toHaveLength(1);
    });

    it('gives up after the third retry', () => {
        const { result, rerender } = renderHook(() => useNewFeatureNotifications(property));

        act(() => vi.advanceTimersByTime(8000));
        mocks.tracks = [{ id: 'introduction', complete: false }];
        rerender();
        act(() => vi.advanceTimersByTime(20000));
        expect(result.current.notifications).toHaveLength(0);
    });

    it('asks the server about an expiry and drops the notification once it passed', () => {
        mocks.tracks = [{ id: 'introduction', complete: false }];
        properties = { ...PROPERTIES, 'notifications.new_feature.expiry.rewardtrack_intro': '2026-12-01 12:00' };
        const send = vi.fn();

        vi.mocked(GetCommunication).mockReturnValue({ ...GetCommunication(), connection: { send } } as never);

        const { result } = renderHook(() => useNewFeatureNotifications(property));

        act(() => vi.advanceTimersByTime(2000));
        expect(send).toHaveBeenCalledWith(expect.objectContaining({ timingCode: '2026-12-01 12:00' }));
        expect(result.current.notifications).toHaveLength(0);

        secondsUntil('2026-12-01 12:00', 3600);
        expect(result.current.notifications).toHaveLength(1);

        const second = renderHook(() => useNewFeatureNotifications(property));

        act(() => vi.advanceTimersByTime(2000));
        secondsUntil('other', 10);
        secondsUntil('2026-12-01 12:00', 0);
        expect(second.result.current.notifications).toHaveLength(0);

        vi.mocked(GetCommunication).mockReset();
    });

    it('hides the promo cancel button until it was opened', () => {
        mocks.tracks = [{ id: 'introduction', complete: false }];
        properties = { ...PROPERTIES, 'notifications.new_feature.type.rewardtrack_intro': 'promo' };
        const { result } = renderHook(() => useNewFeatureNotifications(property));

        act(() => vi.advanceTimersByTime(2000));
        expect(result.current.notifications[0].cancelVisible).toBe(false);
        act(() => result.current.open('rewardtrack_intro'));
        expect(result.current.notifications[0].cancelVisible).toBe(true);
    });

    it('shows nothing for a type without a layout', () => {
        mocks.tracks = [{ id: 'introduction', complete: false }];
        properties = { ...PROPERTIES, 'notifications.new_feature.type.rewardtrack_intro': 'banner' };
        const { result } = renderHook(() => useNewFeatureNotifications(property));

        act(() => vi.advanceTimersByTime(2000));
        expect(result.current.notifications).toHaveLength(0);
    });
});
