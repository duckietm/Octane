import { AchievementData } from '@octane/renderer';
import { IAchievementCategory } from './IAchievementCategory';

/** The order of the category tiles, as in AIR; unknown categories come after these, the archive last. */
const AIR_CATEGORY_ORDER = ['identity', 'explore', 'social', 'pets', 'games', 'room_builder', 'crackables', 'crafting', 'collectibles'];

/** Categories the hook keeps for other screens but the category tiles never show. */
const HIDDEN_CATEGORY_CODES = ['new', 'wired_games'];

const categoryPosition = (code: string): number => {
    if (code === 'archive') return AIR_CATEGORY_ORDER.length + 1;

    const position = AIR_CATEGORY_ORDER.indexOf(code);

    return position < 0 ? AIR_CATEGORY_ORDER.length : position;
};

/** The categories the window shows as tiles, in AIR's order. */
export const getVisibleAchievementCategories = <T extends IAchievementCategory>(categories: readonly T[]): T[] =>
    (categories ?? [])
        .filter((category) => !HIDDEN_CATEGORY_CODES.includes(category.code))
        .sort((left, right) => categoryPosition(left.code) - categoryPosition(right.code));

/** The next level's reward is shown while there is a next level and it gives something (credits are type -1). */
export const getAchievementShowsReward = (achievement: AchievementData): boolean =>
    !!achievement && !achievement.finalLevel && achievement.levelRewardPointType >= -1 && achievement.levelRewardPoints > 0;

/** The progress towards the next level is shown unless the achievement hides it or has no next level. */
export const getAchievementShowsProgress = (achievement: AchievementData): boolean =>
    !!achievement && achievement.displayMethod !== AchievementData.DISPLAY_METHOD_NEVER_SHOW_PROGRESS && !achievement.finalLevel;

/** The share of the current level done, 0 to 1 (a finished achievement is full). */
export const getAchievementLevelRatio = (achievement: AchievementData): number => {
    if (!achievement) return 0;
    if (achievement.finalLevel) return 1;
    if (!(achievement.scoreLimit > 0)) return 0;

    return Math.min(1, Math.max(0, achievement.currentPoints / achievement.scoreLimit));
};

/** The score of the progress bar as the desktop writes it: points so far / points the level needs, both counted from zero. */
export const getAchievementScoreText = (achievement: AchievementData): string =>
    `${achievement.currentPoints + achievement.scoreAtStartOfLevel}/${achievement.scoreLimit + achievement.scoreAtStartOfLevel}`;

/** A share 0 to 1 of two counts, 0 when there is nothing to count. */
export const getProgressRatio = (progress: number, maxProgress: number): number => (maxProgress > 0 ? Math.min(1, Math.max(0, progress / maxProgress)) : 0);
