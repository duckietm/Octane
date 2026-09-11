import { AchievementData, GetLocalizationManager } from '@octane/renderer';
import { GetConfigurationValue, GetOptionalConfigurationValue } from '../octane';
import { localizeWithFallback } from '../utils/localizeWithFallback';
import { IAchievementCategory } from './IAchievementCategory';

const categoryNameFallbacks: Record<string, string> = { new: 'New achievements', wired_games: 'Wired games' };
const achievementImages = import.meta.glob('../../assets/images/achievements/*.png', { eager: true, import: 'default' });

export class AchievementUtilities {
    public static getAchievementCategoryName(category: IAchievementCategory): string {
        const key = `quests.${category.code}.name`;
        return localizeWithFallback(key, categoryNameFallbacks[category.code] ?? key);
    }

    public static getAchievementBadgeCode(achievement: AchievementData): string {
        if (!achievement) return null;

        let badgeId = achievement.badgeId;

        if (achievement.levelCount > 1 && !achievement.finalLevel) badgeId = GetLocalizationManager().getPreviousLevelBadgeId(badgeId);

        return badgeId;
    }

    public static getAchievementImageUrl(imageName: string): string {
        const bundledImage = achievementImages[`../../assets/images/achievements/${imageName}.png`];
        if (bundledImage) return bundledImage;

        const imageUrl = GetConfigurationValue<string>('achievements.images.url', '');

        if (!imageUrl) return '';

        return imageUrl.replace('%image%', imageName);
    }

    public static hasBundledCategoryImage(category: IAchievementCategory): boolean {
        return !!achievementImages[`../../assets/images/achievements/ach_category_${category.code}.png`];
    }

    public static getAchievementCategoryImageUrl(category: IAchievementCategory, icon: boolean = false): string {
        const imageName = `${icon ? 'achicon_' : 'ach_category_'}${category.code}`;
        const fallbackName = `achcategory_${category.code}_${AchievementUtilities.getAchievementCategoryProgress(category) > 0 ? 'active' : 'inactive'}`;

        return AchievementUtilities.getAchievementImageUrl(icon || AchievementUtilities.hasBundledCategoryImage(category) ? imageName : fallbackName);
    }

    public static getAchievementCategoryMaxProgress(category: IAchievementCategory): number {
        if (!category) return 0;

        let progress = 0;

        for (const achievement of category.achievements) {
            progress += achievement.levelCount;
        }

        return progress;
    }

    public static getAchievementCategoryProgress(category: IAchievementCategory): number {
        if (!category) return 0;

        let progress = 0;

        for (const achievement of category.achievements) progress += achievement.finalLevel ? achievement.level : achievement.level - 1;

        return progress;
    }

    public static getAchievementCategoryTotalUnseen(category: IAchievementCategory): number {
        if (!category) return 0;

        let unseen = 0;

        for (const achievement of category.achievements) achievement.unseen > 0 && unseen++;

        return unseen;
    }

    public static getAchievementHasStarted(achievement: AchievementData): boolean {
        if (!achievement) return false;

        if (achievement.finalLevel || achievement.level - 1 > 0) return true;

        return false;
    }

    public static getAchievementIsIgnored(achievement: AchievementData): boolean {
        if (!achievement) return false;

        const ignored = GetConfigurationValue<string[]>('achievements.unseen.ignored', []);
        const skipped = GetOptionalConfigurationValue<string>('toolbar.unseen_notification.skipped_badge_ids', '').split(',').filter(Boolean);

        return ignored.includes(achievement.badgeId.replace(/[0-9]/g, '')) || skipped.some((code) => achievement.badgeId.includes(code));
    }

    public static getAchievementLevel(achievement: AchievementData): number {
        if (!achievement) return 0;

        if (achievement.finalLevel) return achievement.level;

        return achievement.level - 1;
    }
}
