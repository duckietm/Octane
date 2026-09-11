import { AchievementLevelUpData } from '@octane/renderer';
import { NotificationBubbleItem } from './NotificationBubbleItem';
import { NotificationBubbleType } from './NotificationBubbleType';

export class AchievementNotificationBubbleItem extends NotificationBubbleItem {
    public readonly badgeCode: string;

    constructor(data: AchievementLevelUpData, message: string, iconUrl: string) {
        super(message, NotificationBubbleType.ACHIEVEMENT, iconUrl, `questengine/achievements/${data.category}`);
        this.badgeCode = data.badgeCode;
    }
}
