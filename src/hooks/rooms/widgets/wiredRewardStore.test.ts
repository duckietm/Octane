import { beforeEach, describe, expect, it } from 'vitest';
import { receiveWiredReward, useWiredRewardStore } from './wiredRewardStore';

const reward = (openByDefault: boolean, text = '') => ({
    successType: 2,
    hasRewardContents: true,
    rewardRule: { nodes: [{ type: 0 as const, amount: 10, itemType: null }] },
    rewardText: text,
    openByDefault,
});

beforeEach(() => useWiredRewardStore.setState({ receipts: {}, open: [], nextId: 1 }));

describe('receiveWiredReward (AIR RewardNotificationController.onTransactionSuccess)', () => {
    it('gives each reward its own link, so an older notification still opens its own reward', () => {
        expect(receiveWiredReward(reward(false, 'one'))).toBe('wiredchestreward/open/1');
        expect(receiveWiredReward(reward(false, 'two'))).toBe('wiredchestreward/open/2');

        expect(useWiredRewardStore.getState().receipts[1].text).toBe('one');
        expect(useWiredRewardStore.getState().open).toEqual([]);
    });

    it('opens a reward that opens by default and gives its notification no link', () => {
        expect(receiveWiredReward(reward(true))).toBeNull();
        expect(useWiredRewardStore.getState().open).toEqual([1]);
    });

    it('ignores any other success and a reward without contents', () => {
        expect(receiveWiredReward({ ...reward(false), successType: 4 })).toBeNull();
        expect(receiveWiredReward({ ...reward(false), hasRewardContents: false, rewardRule: null })).toBeNull();
        expect(useWiredRewardStore.getState().receipts).toEqual({});
    });
});
