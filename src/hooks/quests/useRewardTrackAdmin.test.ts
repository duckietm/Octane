import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRewardTrackAdmin } from './useRewardTrackAdmin';

const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    handlers: new Map<unknown, (event: unknown) => void>()
}));

vi.mock('../../api', () => ({ SendMessageComposer: mocks.send }));
vi.mock('../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => {
        mocks.handlers.set(type, handler);
    }
}));

const dispatch = async (type: unknown, parser: Record<string, unknown>) => {
    await act(async () => {
        mocks.handlers.get(type)({ getParser: () => parser });
    });
};

afterEach(() => {
    cleanup();
    mocks.send.mockClear();
    mocks.handlers.clear();
});

describe('useRewardTrackAdmin', () => {
    it('sends the task with its levels flattened behind their count', () => {
        const { result } = renderHook(() => useRewardTrackAdmin());

        act(() => {
            result.current.saveTask({
                trackId: 'season_1',
                id: 'talk',
                actionType: 'chat_with_someone',
                parameter: '',
                premium: false,
                sortOrder: 1,
                levels: [
                    { requiredCount: 2, pointsReward: 10, premium: false },
                    { requiredCount: 4, pointsReward: 20, premium: true }
                ]
            });
        });

        expect(result.current.pending).toBe(true);
        expect(mocks.send).toHaveBeenCalledTimes(1);
        expect(mocks.send.mock.calls[0][0].getMessageArray()).toEqual([ 'season_1', 'talk', 'chat_with_someone', '', false, 1, 2, 2, 10, false, 4, 20, true ]);
    });

    it('keeps the server choices and tracks, and clears pending on the answer', async () => {
        const { RewardTrackAdminDataMessageEvent, RewardTrackAdminResultMessageEvent } = await import('@octane/renderer');
        const { result } = renderHook(() => useRewardTrackAdmin());

        expect(result.current.loaded).toBe(false);

        await dispatch(RewardTrackAdminDataMessageEvent, {
            actionTypes: [ 'chat_with_someone' ],
            rewardTypes: [ 'duckets', 'badge' ],
            tracks: [ { id: 'season_1', enabled: false, tasks: [], prizes: [] } ]
        });

        expect(result.current.loaded).toBe(true);
        expect(result.current.actionTypes).toEqual([ 'chat_with_someone' ]);
        expect(result.current.rewardTypes).toEqual([ 'duckets', 'badge' ]);
        expect(result.current.tracks[0].id).toBe('season_1');

        act(() => result.current.deleteEntity('prize', 'season_1', 'p1'));
        expect(result.current.pending).toBe(true);
        expect(mocks.send.mock.calls[0][0].getMessageArray()).toEqual([ 'prize', 'season_1', 'p1' ]);

        await dispatch(RewardTrackAdminResultMessageEvent, { success: false, message: 'Unknown reward type: gold', entity: 'prize', trackId: 'season_1', id: 'p1' });

        expect(result.current.pending).toBe(false);
        expect(result.current.lastResult).toMatchObject({ success: false, message: 'Unknown reward type: gold', entity: 'prize', sequence: 1 });

        await dispatch(RewardTrackAdminResultMessageEvent, { success: true, message: '', entity: 'prize', trackId: 'season_1', id: 'p1' });

        expect(result.current.lastResult.sequence).toBe(2);
    });
});
