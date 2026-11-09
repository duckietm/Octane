import { describe, expect, it } from 'vitest';
import {
    findTalentTask,
    getCurrentLevelIndex,
    getCurrentTalentTrack,
    getTalentProductImageUrl,
    getTalentTaskAction,
    getTalentTrackProgress,
    hasTaskProgressDisplay,
    isTalentPromoVisible,
    ITalentLevel,
    prepareTalentTrack,
    shouldShowTalentLevelUp,
    splitTalentTasks,
    TALENT_STATE_ACHIEVED,
    TALENT_STATE_IN_PROGRESS,
    TALENT_STATE_LOCKED,
    TALENT_TRACK_CITIZENSHIP,
    TALENT_TRACK_HELPER
} from './TalentTrack';

const task = (id: number, state: number, badgeCode = `ACH_Task${id}`) => ({ id, requiredLevel: 1, badgeCode, state, currentScore: 0, totalScore: 1 });

const levels: ITalentLevel[] = [
    { level: 0, state: TALENT_STATE_ACHIEVED, tasks: [task(1, TALENT_STATE_ACHIEVED)], perks: [], products: [] },
    { level: 1, state: TALENT_STATE_IN_PROGRESS, tasks: [task(2, TALENT_STATE_ACHIEVED), task(3, TALENT_STATE_IN_PROGRESS)], perks: [], products: [] },
    { level: 2, state: TALENT_STATE_LOCKED, tasks: [task(4, TALENT_STATE_LOCKED)], perks: [], products: [] },
    { level: 3, state: TALENT_STATE_LOCKED, tasks: [], perks: [], products: [] }
];

describe('TalentTrack', () => {
    it('picks the citizenship track until the user is a citizen', () => {
        expect(getCurrentTalentTrack(true, false)).toBe(TALENT_TRACK_CITIZENSHIP);
        expect(getCurrentTalentTrack(true, true)).toBe(TALENT_TRACK_HELPER);
        expect(getCurrentTalentTrack(false, false)).toBe(TALENT_TRACK_HELPER);
    });

    it('drops the first helper level while citizenship is on', () => {
        expect(prepareTalentTrack({ name: TALENT_TRACK_HELPER, levels }, true).levels).toHaveLength(3);
        expect(prepareTalentTrack({ name: TALENT_TRACK_HELPER, levels }, false).levels).toHaveLength(4);
        expect(prepareTalentTrack({ name: TALENT_TRACK_CITIZENSHIP, levels }, true).levels).toHaveLength(4);
    });

    it('fills the bar up to the achieved tasks of the current level', () => {
        expect(getCurrentLevelIndex(levels)).toBe(1);
        expect(getTalentTrackProgress(levels)).toBeCloseTo(0.25 + 0.125);
        expect(getTalentTrackProgress([])).toBe(0);
    });

    it('balances the tasks over two rows', () => {
        const [top, bottom] = splitTalentTasks([task(1, 0), task(2, 0), task(3, 0), task(4, 0, '')]);

        expect(top.map((entry) => entry.id)).toEqual([1, 3]);
        expect(bottom.map((entry) => entry.id)).toEqual([2]);
    });

    it('opens only tasks of unlocked levels', () => {
        expect(findTalentTask(levels, 3)?.id).toBe(3);
        expect(findTalentTask(levels, 4)).toBeNull();
    });

    it('maps the task action buttons and progress display', () => {
        expect(getTalentTaskAction('ACH_SafetyQuizGraduate1')).toBe('safety');
        expect(getTalentTaskAction('ACH_RoomEntry2')).toBe('navigator');
        expect(getTalentTaskAction('ACH_Other1')).toBeNull();
        expect(hasTaskProgressDisplay('ACH_HabboWayGraduate1')).toBe(false);
        expect(hasTaskProgressDisplay('ACH_RespectGiven1')).toBe(true);
    });

    it('keeps the AIR picture and popup rules', () => {
        expect(getTalentProductImageUrl('lib/', 'Habbo Club')).toBe('lib/talent/reward_product_habbo_club.png');
        expect(shouldShowTalentLevelUp(TALENT_TRACK_HELPER, 1, true)).toBe(false);
        expect(shouldShowTalentLevelUp(TALENT_TRACK_HELPER, 2, true)).toBe(true);
        expect(isTalentPromoVisible('citizenship', 2, 4)).toBe(true);
        expect(isTalentPromoVisible('citizenship', 4, 4)).toBe(false);
        expect(isTalentPromoVisible('', 0, 4)).toBe(false);
    });
});
