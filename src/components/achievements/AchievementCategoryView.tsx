import { FC } from 'react';
import { AchievementCategory } from '../../api';
import { useAchievements } from '../../hooks';
import { AchievementDetailsView } from './AchievementDetailsView';
import { AchievementListView } from './achievement-list';

interface AchievementCategoryViewProps {
    category: AchievementCategory;
}

export const AchievementCategoryView: FC<AchievementCategoryViewProps> = (props) => {
    const { category = null } = props;
    const { selectedAchievement = null, visibleAchievements = [] } = useAchievements();

    if (!category) return null;

    return (
        <div className="air-achievements-category-body">
            <AchievementListView achievements={visibleAchievements} isScrollable={category.achievements.length > 24} />
            {!!selectedAchievement && <AchievementDetailsView achievement={selectedAchievement} />}
        </div>
    );
};
