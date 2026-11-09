/**
 * Pure rules of AIR's friendbar/talent (TalentTrackController, TalentProgressMeter,
 * TalentLevelUpController) and session/talent/TalentEnum.
 */

export const TALENT_TRACK_CITIZENSHIP = 'citizenship';
export const TALENT_TRACK_HELPER = 'helper';
export const TALENT_TRACKS = [TALENT_TRACK_CITIZENSHIP, TALENT_TRACK_HELPER];

/** class_4264 states of a level and of a task. */
export const TALENT_STATE_LOCKED = 0;
export const TALENT_STATE_IN_PROGRESS = 1;
export const TALENT_STATE_ACHIEVED = 2;

/** class_4300: the tasks that come with an action button in their progress dialog. */
export const TALENT_TASK_AVATAR_LOOKS = 'ACH_AvatarLooks1';
export const TALENT_TASK_EMAIL_VERIFICATION = 'ACH_EmailVerification1';
export const TALENT_TASK_GUIDE_ADVERTISEMENT = 'ACH_GuideAdvertisementReader1';
export const TALENT_TASK_GUIDE_GROUP_MEMBER = 'ACH_GuideGroupMember1';
export const TALENT_TASK_HABBO_WAY = 'ACH_HabboWayGraduate1';
export const TALENT_TASK_ROOM_ENTRY_1 = 'ACH_RoomEntry1';
export const TALENT_TASK_ROOM_ENTRY_2 = 'ACH_RoomEntry2';
export const TALENT_TASK_SAFETY_QUIZ = 'ACH_SafetyQuizGraduate1';

export interface ITalentTask {
    id: number;
    requiredLevel: number;
    badgeCode: string;
    state: number;
    currentScore: number;
    totalScore: number;
}

export interface ITalentReward {
    productCode: string;
    vipDays: number;
}

export interface ITalentLevel {
    level: number;
    state: number;
    tasks: ITalentTask[];
    perks: string[];
    products: ITalentReward[];
}

export interface ITalentTrack {
    name: string;
    levels: ITalentLevel[];
}

/**
 * SessionDataManager.currentTalentTrack: citizenship while it is on and the user is not a
 * citizen yet, the helper track otherwise.
 */
export const getCurrentTalentTrack = (citizenshipEnabled: boolean, isCitizen: boolean): string =>
    citizenshipEnabled && !isCitizen ? TALENT_TRACK_CITIZENSHIP : TALENT_TRACK_HELPER;

/**
 * createWindow: with citizenship on, the first level of the other tracks is the citizenship
 * itself and is left out (removeFirstLevel).
 */
export const prepareTalentTrack = (track: ITalentTrack, citizenshipEnabled: boolean): ITalentTrack => {
    if (!citizenshipEnabled || track.name === TALENT_TRACK_CITIZENSHIP || !track.levels.length) return track;

    return { ...track, levels: track.levels.slice(1) };
};

/** The index of the level in progress (class_4264.parse keeps the last one). */
export const getCurrentLevelIndex = (levels: ITalentLevel[]): number => {
    let index = 0;

    levels.forEach((level, levelIndex) => {
        if (level.state === TALENT_STATE_IN_PROGRESS) index = levelIndex;
    });

    return index;
};

/** class_2646: the share of the tasks of a level that are achieved. */
export const getLevelProgress = (level: ITalentLevel): number => {
    if (!level || !level.tasks.length) return 0;

    const done = level.tasks.filter((task) => task.state === TALENT_STATE_ACHIEVED).length;

    return Math.min(1, Math.max(0, done / level.tasks.length));
};

/**
 * class_4264 progress: every level takes the same part of the bar, the current one filled as far
 * as its achieved tasks go.
 */
export const getTalentTrackProgress = (levels: ITalentLevel[]): number => {
    if (!levels.length) return 0;

    const perLevel = 1 / levels.length;
    const current = getCurrentLevelIndex(levels);

    return Math.min(1, Math.max(0, current * perLevel + getLevelProgress(levels[current]) * perLevel));
};

/** Vl.hasProgressDisplay: the one-off tasks have no score to show. */
export const hasTaskProgressDisplay = (badgeCode: string): boolean =>
    ![TALENT_TASK_HABBO_WAY, TALENT_TASK_SAFETY_QUIZ, TALENT_TASK_EMAIL_VERIFICATION, TALENT_TASK_AVATAR_LOOKS].includes(badgeCode);

/** _reb432d92949a11: the tasks of a level fill two rows, the shorter row taking the next task. */
export const splitTalentTasks = (tasks: ITalentTask[]): [ITalentTask[], ITalentTask[]] => {
    const top: ITalentTask[] = [];
    const bottom: ITalentTask[] = [];

    for (const task of tasks) {
        if (!task.badgeCode) continue;

        if (top.length <= bottom.length) top.push(task);
        else bottom.push(task);
    }

    return [top, bottom];
};

/** class_4264.findTaskByAchievementId: only tasks of unlocked levels open their dialog. */
export const findTalentTask = (levels: ITalentLevel[], achievementId: number): ITalentTask => {
    let found: ITalentTask = null;

    for (const level of levels) {
        if (level.state === TALENT_STATE_LOCKED) continue;

        const task = level.tasks.find((candidate) => candidate.id === achievementId);

        if (task) found = task;
    }

    return found;
};

/** TalentLevelUpController.createRewardProduct: the product picture of the image library. */
export const getTalentProductImageUrl = (library: string, productCode: string): string =>
    `${library}talent/reward_product_${(productCode ?? '').toLowerCase().replaceAll(' ', '_')}.png`;

export const getTalentLevelImageUrl = (library: string, track: string, level: number): string => `${library}talent/${track}_${level}.png`;

export const getTalentLevelUpImageUrl = (library: string, track: string, level: number): string => `${library}talent/${track}_levelup_${level}.png`;

/** TalentLevelUpController.onTalentLevelUp: the first helper level is the citizenship one, no popup. */
export const shouldShowTalentLevelUp = (track: string, level: number, citizenshipEnabled: boolean): boolean =>
    !(level === 1 && track === TALENT_TRACK_HELPER && citizenshipEnabled);

export type TalentTaskAction = 'habboway' | 'safety' | 'guidegroup' | 'navigator' | 'clothes' | null;

/** _r611e65c31ccbc6: what the action button of a task's dialog does, by its badge code. */
export const getTalentTaskAction = (badgeCode: string): TalentTaskAction => {
    switch (badgeCode) {
        case TALENT_TASK_HABBO_WAY:
            return 'habboway';
        case TALENT_TASK_SAFETY_QUIZ:
            return 'safety';
        case TALENT_TASK_GUIDE_GROUP_MEMBER:
            return 'guidegroup';
        case TALENT_TASK_ROOM_ENTRY_1:
        case TALENT_TASK_ROOM_ENTRY_2:
            return 'navigator';
        case TALENT_TASK_AVATAR_LOOKS:
            return 'clothes';
        default:
            return null;
    }
};

/** The achievement of a level badge (`ACH_RoomEntry2` -> `ACH_RoomEntry`), as the instruction texts are keyed. */
export const getAchievementBaseCode = (badgeCode: string): string => (badgeCode ?? '').replace(/\d+$/, '');

export const getTalentTaskActionKey = (track: string, badgeCode: string, suffix: 'description' | 'link'): string =>
    `talent.track.task.action.${track}.${badgeCode}.${suffix}`;

/** TalentPromoCtrl: the promo shows until the promoted track's top level is reached. */
export const isTalentPromoVisible = (promotedTrack: string, level: number, maxLevel: number): boolean =>
    !!promotedTrack && maxLevel > 0 && level < maxLevel;
