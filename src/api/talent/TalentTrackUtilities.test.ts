import { describe, expect, it } from 'vitest';
import {
    findTalentTaskByAchievementId,
    getTalentCurrentLevelIndex,
    getTalentLevelIllustrationUrl,
    getTalentLevelProgress,
    getTalentRewardProductUrl,
    getTalentTaskActionKey,
    getTalentTaskProgressWidth,
    getTalentTotalProgress,
    getVisibleTalentLevels,
    hasTalentTaskProgressDisplay,
    normalizeTalentPerkIds,
    normalizeTalentTrackName,
    shouldShowTalentLevelUp,
    TALENT_STATE_COMPLETED,
    TALENT_STATE_IN_PROGRESS,
    TALENT_STATE_LOCKED,
    TalentTrackLevelLike,
    TalentTrackTaskLike
} from './TalentTrackUtilities';

const task = (id: number, state: number, badgeCode = `ACH_Task${id}`, currentScore = 0, totalScore = 10): TalentTrackTaskLike => ({
    id,
    requiredLevel: 1,
    badgeCode,
    state,
    currentScore,
    totalScore
});

const level = (index: number, state: number, tasks: TalentTrackTaskLike[]): TalentTrackLevelLike => ({ level: index, state, tasks, perks: [], items: [] });

const track: TalentTrackLevelLike[] = [
    level(0, TALENT_STATE_COMPLETED, [task(1, TALENT_STATE_COMPLETED)]),
    level(1, TALENT_STATE_IN_PROGRESS, [task(2, TALENT_STATE_COMPLETED), task(3, TALENT_STATE_IN_PROGRESS, 'ACH_RoomEntry1', 3, 10)]),
    level(2, TALENT_STATE_LOCKED, [task(4, TALENT_STATE_LOCKED)]),
    level(3, TALENT_STATE_LOCKED, [task(3, TALENT_STATE_LOCKED)])
];

describe('talent track utilities', () => {
    it('normalizes the track name the emulator sends in upper case', () => {
        expect(normalizeTalentTrackName('CITIZENSHIP')).toBe('citizenship');
        expect(normalizeTalentTrackName(' Helper ')).toBe('helper');
        expect(normalizeTalentTrackName('')).toBe('citizenship');
    });

    it('measures the level and the total progress like TalentTrack.totalProgress', () => {
        expect(getTalentLevelProgress(track[1])).toBe(0.5);
        expect(getTalentLevelProgress(level(9, TALENT_STATE_LOCKED, []))).toBe(0);
        expect(getTalentCurrentLevelIndex(track)).toBe(1);
        expect(getTalentTotalProgress(track)).toBeCloseTo(0.375);
        expect(getTalentTotalProgress([])).toBe(0);
    });

    it('drops the first helper level when citizenship is on and keeps the citizenship track whole', () => {
        expect(getVisibleTalentLevels('helper', track, true)).toHaveLength(3);
        expect(getVisibleTalentLevels('helper', track, false)).toHaveLength(4);
        expect(getVisibleTalentLevels('citizenship', track, true)).toHaveLength(4);
    });

    it('finds a task only among the unlocked levels and prefers the later match', () => {
        expect(findTalentTaskByAchievementId(track, 3).state).toBe(TALENT_STATE_IN_PROGRESS);
        expect(findTalentTaskByAchievementId(track, 4)).toBeNull();
    });

    it('hides the progress bar for the one-shot tasks and maps the bar width', () => {
        expect(hasTalentTaskProgressDisplay('ACH_HabboWayGraduate1')).toBe(false);
        expect(hasTalentTaskProgressDisplay('ACH_RoomEntry1')).toBe(true);
        expect(getTalentTaskProgressWidth(task(1, TALENT_STATE_IN_PROGRESS, 'x', 3, 10), 48)).toBe(14);
        expect(getTalentTaskProgressWidth(task(1, TALENT_STATE_IN_PROGRESS, 'x', 30, 10), 48)).toBe(48);
        expect(getTalentTaskProgressWidth(task(1, TALENT_STATE_IN_PROGRESS, 'x', 0, 0), 48)).toBe(0);
    });

    it('keeps helper level 1 silent when citizenship is on', () => {
        expect(shouldShowTalentLevelUp('helper', 1, true)).toBe(false);
        expect(shouldShowTalentLevelUp('helper', 1, false)).toBe(true);
        expect(shouldShowTalentLevelUp('citizenship', 1, true)).toBe(true);
    });

    it('keeps the perk ids as strings whatever the parser hands back', () => {
        expect(normalizeTalentPerkIds([{ perkId: 'TRADE' }, { perkId: 7 }, { perkId: undefined }])).toEqual(['TRADE', '7']);
    });

    it('builds the text keys and the image urls the official windows use', () => {
        expect(getTalentTaskActionKey('citizenship', 'ACH_RoomEntry2', 'link')).toBe('talent.track.task.action.citizenship.ACH_RoomEntry.link');
        expect(getTalentLevelIllustrationUrl('CITIZENSHIP', 2)).toBe('talent/citizenship_2.png');
        expect(getTalentRewardProductUrl('Pixel Walldeco')).toBe('talent/reward_product_pixel_walldeco.png');
    });
});
