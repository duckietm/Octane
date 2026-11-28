import { AchievementData } from '@octane/renderer';
import { FC } from 'react';
import {
    AchievementUtilities,
    getAchievementShowsProgress,
    getAchievementShowsReward,
    LocalizeBadgeDescription,
    LocalizeBadgeName,
    LocalizeText
} from '../../api';
import { LayoutCurrencyIcon } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { AchievementBadgeView } from './AchievementBadgeView';
import { AirAchievementProgressBar } from './AirAchievementProgressBar';

interface AchievementDetailsViewProps {
    achievement: AchievementData;
}

export const AchievementDetailsView: FC<AchievementDetailsViewProps> = (props) => {
    const { achievement = null } = props;

    if (!achievement) return null;

    const badgeCode = AchievementUtilities.getAchievementBadgeCode(achievement);
    // Credit rewards (currency type -1) count too.
    const showReward = getAchievementShowsReward(achievement);
    const showProgress = getAchievementShowsProgress(achievement);

    return (
        <NativeTextTree>
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
                    />
                )}
            </div>
        </NativeTextTree>
    );
};
