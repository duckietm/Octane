import { describe, expect, it } from 'vitest';
import {
    filterRewardTrackTasks,
    formatFriendlySeconds,
    getCampaignCounterStyle,
    getDailyTaskProgressPercent,
    getDailyTaskStyle,
    getPremiumBoostPercent,
    getQuestImageName,
    getQuestProgressPercent,
    getRewardTrackPrizeState,
    isQuestRewardVisible,
    paginatePrizes,
    resolveRewardTrackTheme,
    sortDailyTasks
} from './QuestUtilities';

describe('quest image names', () => {
    it('lower-cases campaign, code and version', () => {
        expect(getQuestImageName('Chat', 'chat_1', '2')).toBe('chat_chat_12');
    });

    it('adds the prompt suffix for the animated quests', () => {
        expect(getQuestImageName('social', 'MOVEITEM', '')).toBe('social_moveitem_a');
    });

    it('shows the hourglass while the quest waits', () => {
        expect(getQuestImageName('chat', 'chat_1', '1', true)).toBe('quest_timer_questionmark');
    });
});

describe('quest progress and counters', () => {
    it('rounds the tracker percentage up and clamps it', () => {
        expect(getQuestProgressPercent(1, 3)).toBe(34);
        expect(getQuestProgressPercent(5, 3)).toBe(100);
        expect(getQuestProgressPercent(0, 0)).toBe(0);
    });

    it('picks the counter background like the official campaign block', () => {
        expect(getCampaignCounterStyle(0, false)).toBe('red');
        expect(getCampaignCounterStyle(2, false)).toBe('blue');
        expect(getCampaignCounterStyle(3, true)).toBe('green');
    });

    it('hides empty or unknown rewards', () => {
        expect(isQuestRewardVisible(0, 20)).toBe(true);
        expect(isQuestRewardVisible(-1, 5)).toBe(true);
        expect(isQuestRewardVisible(0, 0)).toBe(false);
        expect(isQuestRewardVisible(-2, 10)).toBe(false);
    });
});

describe('daily tasks', () => {
    it('colours rows by status and keeps bonus rows yellow', () => {
        expect(getDailyTaskStyle(0, false)).toBe('orange');
        expect(getDailyTaskStyle(1, false)).toBe('green');
        expect(getDailyTaskStyle(2, false)).toBe('green');
        expect(getDailyTaskStyle(0, true)).toBe('yellow');
    });

    it('floors the progress percentage', () => {
        expect(getDailyTaskProgressPercent(2, 3)).toBe(66);
        expect(getDailyTaskProgressPercent(4, 3)).toBe(100);
    });

    it('puts bonus tasks last', () => {
        const tasks = [
            { isBonus: true, taskId: 1 },
            { isBonus: false, taskId: 2 },
            { isBonus: false, taskId: 3 }
        ] as never[];

        expect(sortDailyTasks(tasks).map((task: { taskId: number }) => task.taskId)).toEqual([2, 3, 1]);
    });

    it('formats countdowns', () => {
        expect(formatFriendlySeconds(59)).toBe('59s');
        expect(formatFriendlySeconds(3725)).toBe('1h 2m');
        expect(formatFriendlySeconds(90000)).toBe('1d 1h');
    });
});

describe('reward track', () => {
    const track = (points: number, premium: boolean) => ({ points, premium }) as never;
    const prize = (requiredPoints: number, premium: boolean, claimed: boolean) =>
        ({
            requiredPoints,
            premium,
            claimed,
            isPremiumLocked: (t: { premium: boolean }) => premium && !t.premium,
            hasEnoughPoints: (t: { points: number }) => t.points >= requiredPoints
        }) as never;

    it('resolves the four prize states in the official order', () => {
        expect(getRewardTrackPrizeState(prize(10, false, true), track(50, false))).toBe('claimed');
        expect(getRewardTrackPrizeState(prize(10, true, false), track(50, false))).toBe('premium_locked');
        expect(getRewardTrackPrizeState(prize(100, false, false), track(50, false))).toBe('not_enough_points');
        expect(getRewardTrackPrizeState(prize(10, false, false), track(50, false))).toBe('claimable');
        expect(getRewardTrackPrizeState(prize(10, true, false), track(50, true))).toBe('claimable');
    });

    it('falls back to the blue theme', () => {
        expect(resolveRewardTrackTheme('unknown').dark).toBe('#3577B9');
        expect(resolveRewardTrackTheme('red').dark).toBe('#B84A4B');
    });

    it('filters tasks by the three tabs', () => {
        const tasks = [
            { id: 'a', hasProgress: false, isComplete: false },
            { id: 'b', hasProgress: true, isComplete: false },
            { id: 'c', hasProgress: true, isComplete: true }
        ];

        expect(filterRewardTrackTasks(tasks, 'all').length).toBe(3);
        expect(filterRewardTrackTasks(tasks, 'in_progress').map((task) => task.id)).toEqual(['b']);
        expect(filterRewardTrackTasks(tasks, 'completed').map((task) => task.id)).toEqual(['c']);
    });

    it('paginates prizes by required points', () => {
        const pages = paginatePrizes([{ requiredPoints: 60 }, { requiredPoints: 20 }, { requiredPoints: 120 }], 2);

        expect(pages.length).toBe(2);
        expect(pages[0].map((p) => p.requiredPoints)).toEqual([20, 60]);
        expect(paginatePrizes([], 4)).toEqual([[]]);
    });

    it('turns the boost multiplier into a percentage', () => {
        expect(getPremiumBoostPercent(1.5)).toBe(50);
        expect(getPremiumBoostPercent(1)).toBe(0);
    });
});
