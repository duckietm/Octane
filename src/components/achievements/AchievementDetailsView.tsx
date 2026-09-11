import { AchievementData } from '@octane/renderer';
import { FC } from 'react';
import { AchievementUtilities, LocalizeBadgeDescription, LocalizeBadgeName, LocalizeText } from '../../api';
import { LayoutCurrencyIcon } from '../../common';
import { AchievementBadgeView } from './AchievementBadgeView';
import { AirAchievementProgressBar } from './AirAchievementProgressBar';

interface AchievementDetailsViewProps {
    achievement: AchievementData;
}

export const AchievementDetailsView: FC<AchievementDetailsViewProps> = (props) => {
    const { achievement = null } = props;

    if (!achievement) return null;

    const badgeCode = AchievementUtilities.getAchievementBadgeCode(achievement);
    // Polaris also supports credit rewards with currency type -1.
    const showReward = !achievement.finalLevel && achievement.levelRewardPointType >= -1 && achievement.levelRewardPoints > 0;
    const showProgress = achievement.displayMethod !== AchievementData.DISPLAY_METHOD_NEVER_SHOW_PROGRESS && !achievement.finalLevel;

    return (
        <div className="air-achievement-details">
            <div className="air-achievement-details-badge">
                <AchievementBadgeView achievement={achievement} className="air-achievement-details-badge-image" />
            </div>
            <div className="air-achievement-details-name">{LocalizeBadgeName(badgeCode)}</div>
            <div className="air-achievement-details-description">{LocalizeBadgeDescription(badgeCode)}</div>
            {showReward && (
                <div className="air-achievement-details-reward">
                    <span>{LocalizeText('achievements.details.reward')}</span>
                    <strong>{achievement.levelRewardPoints}</strong>
                    <LayoutCurrencyIcon className="air-achievement-details-currency" type={achievement.levelRewardPointType} />
                </div>
            )}
            <div className="air-achievement-details-level">
                {LocalizeText(
                    'achievements.details.level',
                    ['level', 'limit'],
                    [AchievementUtilities.getAchievementLevel(achievement).toString(), achievement.levelCount.toString()]
                )}
            </div>
            {showProgress && (
                <AirAchievementProgressBar
                    className="air-achievement-details-progress"
                    width={180}
                    progress={achievement.currentPoints}
                    maxProgress={achievement.scoreLimit}
                    key={`${achievement.achievementId}:${achievement.level}:${achievement.scoreLimit}`}
                    scoreAtStartOfLevel={achievement.scoreAtStartOfLevel}
                    localizationKey="achievements.details.progress"
                />
            )}
        </div>
    );
};
