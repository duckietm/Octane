import { AchievementData } from '@octane/renderer';
import { CSSProperties, FC } from 'react';
import { AchievementUtilities } from '../../../api';
import { useAchievements } from '../../../hooks';
import { AchievementBadgeView } from '../AchievementBadgeView';

interface AchievementListItemViewProps {
    achievement: AchievementData | null;
}

export const AchievementListItemView: FC<AchievementListItemViewProps> = (props) => {
    const { achievement = null } = props;
    const { selectedAchievement = null, setSelectedAchievementId = null } = useAchievements();

    if (!achievement) {
        return (
            <div
                className="air-achievement-tile air-achievement-tile--empty"
                style={
                    {
                        '--air-achievement-tile-background': `url(${AchievementUtilities.getAchievementImageUrl('achievement_inactive')})`
                    } as CSSProperties
                }
                aria-hidden="true"
            />
        );
    }

    const isSelected = selectedAchievement === achievement;

    return (
        <button
            type="button"
            className={`air-achievement-tile${isSelected ? ' is-selected' : ''}${achievement.unseen > 0 ? ' is-unseen' : ''}`}
            style={
                {
                    '--air-achievement-tile-background': `url(${AchievementUtilities.getAchievementImageUrl(
                        isSelected ? 'achievement_active' : 'achievement_inactive'
                    )})`
                } as CSSProperties
            }
            onClick={() => setSelectedAchievementId(achievement.achievementId)}
        >
            <AchievementBadgeView achievement={achievement} className="air-achievement-tile-badge" />
        </button>
    );
};
