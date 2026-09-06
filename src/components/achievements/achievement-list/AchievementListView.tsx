import { AchievementData } from '@octane/renderer';
import { CSSProperties, FC } from 'react';
import { AchievementListItemView } from './AchievementListItemView';

interface AchievementListViewProps {
    achievements: AchievementData[];
}

export const AchievementListView: FC<AchievementListViewProps> = (props) => {
    const { achievements = null } = props;
    const isScrollable = (achievements?.length ?? 0) > 24;
    const itemCount = isScrollable ? achievements.length : Math.max(12, achievements?.length ?? 0);

    return (
        <div className={`air-achievements-list${isScrollable ? ' is-scrollable has-classic-scrollbar' : ''}`}>
            <svg className="air-achievements-color-filters" width="0" height="0" aria-hidden="true">
                <filter id="air-achievement-unseen-tint" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values="0.768627451 0 0 0 0  0 1 0 0 0  0 0 0.498039216 0 0  0 0 0 1 0" />
                </filter>
            </svg>
            <div className="air-achievements-list-grid" style={{ '--air-achievement-columns': isScrollable ? 5 : 6 } as CSSProperties}>
                {Array.from({ length: itemCount }, (_, index) => {
                    const achievement = achievements?.[index] ?? null;

                    return <AchievementListItemView key={achievement?.achievementId ?? `empty-${index}`} achievement={achievement} />;
                })}
            </div>
        </div>
    );
};
