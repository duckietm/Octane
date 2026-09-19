import { describe, expect, it } from 'vitest';
import { reorderRewardTrackEntries, validateRewardTrackInput, validateRewardTrackPrizeInput, validateRewardTrackTaskInput } from './RewardTrackAdminRules';

const track = { id: 'season_1', theme: 'blue', startsAt: 0, endsAt: 0, hasPremium: true, premiumBoostPercent: 150, premiumInstantPoints: 50, premiumCostDiamonds: 25, premiumCostCredits: 0 };

describe('reward track editor rules', () => {
    it('mirror the server on ids, dates and premium bounds', () => {
        expect(validateRewardTrackInput(track)).toEqual({});
        expect(validateRewardTrackInput({ ...track, id: 'has space' }).id).toBeTruthy();
        expect(validateRewardTrackInput({ ...track, theme: '' }).theme).toBeTruthy();
        expect(validateRewardTrackInput({ ...track, startsAt: 200, endsAt: 100 }).endsAt).toBeTruthy();
        expect(validateRewardTrackInput({ ...track, premiumBoostPercent: 5000 }).premiumBoostPercent).toBeTruthy();
        expect(validateRewardTrackInput({ ...track, hasPremium: false, premiumBoostPercent: 5000 })).toEqual({});
    });

    it('point at the level that breaks the growing order', () => {
        const actions = [ 'chat_with_someone' ];
        const task = { id: 'talk', actionType: 'chat_with_someone', parameter: '', levels: [ { requiredCount: 2, pointsReward: 10 }, { requiredCount: 4, pointsReward: 20 } ] };

        expect(validateRewardTrackTaskInput(task, actions)).toEqual({});
        expect(validateRewardTrackTaskInput({ ...task, actionType: 'dance' }, actions).actionType).toBeTruthy();
        expect(validateRewardTrackTaskInput({ ...task, levels: [] }, actions).levels).toBeTruthy();

        const broken = validateRewardTrackTaskInput({ ...task, levels: [ { requiredCount: 4, pointsReward: 10 }, { requiredCount: 2, pointsReward: 20 } ] }, actions);
        expect(broken['level.1.requiredCount']).toBeTruthy();
        expect(broken['level.0.requiredCount']).toBeUndefined();
    });

    it('ask a badge for its code and a furni for its name and a sane amount', () => {
        const types = [ 'duckets', 'badge', 'furni' ];
        const prize = { id: 'p1', requiredPoints: 20, productItemTypeId: 0, rewardType: 'duckets', extraParams: '', rewardAmount: 50 };

        expect(validateRewardTrackPrizeInput(prize, types)).toEqual({});
        expect(validateRewardTrackPrizeInput({ ...prize, rewardType: 'badge' }, types).extraParams).toBeTruthy();
        expect(validateRewardTrackPrizeInput({ ...prize, rewardType: 'furni', extraParams: 'club_sofa', rewardAmount: 50 }, types).rewardAmount).toBeTruthy();
        expect(validateRewardTrackPrizeInput({ ...prize, rewardType: 'furni', extraParams: 'club_sofa', rewardAmount: 1 }, types)).toEqual({});
        expect(validateRewardTrackPrizeInput({ ...prize, rewardType: 'gold' }, types).rewardType).toBeTruthy();
    });

    it('renumber only the entries a move touches', () => {
        const entries = [ { id: 'a', sortOrder: 1 }, { id: 'b', sortOrder: 2 }, { id: 'c', sortOrder: 3 } ];

        expect(reorderRewardTrackEntries(entries, 2, 0)).toEqual([ { id: 'c', sortOrder: 1 }, { id: 'a', sortOrder: 2 }, { id: 'b', sortOrder: 3 } ]);
        expect(reorderRewardTrackEntries(entries, 0, 1)).toEqual([ { id: 'b', sortOrder: 1 }, { id: 'a', sortOrder: 2 } ]);
        expect(reorderRewardTrackEntries(entries, 1, 1)).toEqual([]);
        expect(reorderRewardTrackEntries(entries, 0, 5)).toEqual([]);
    });
});
