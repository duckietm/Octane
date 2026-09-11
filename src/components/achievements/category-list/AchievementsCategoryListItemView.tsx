import { CSSProperties, FC } from 'react';
import { AchievementUtilities, IAchievementCategory } from '../../../api';

interface AchievementCategoryListItemViewProps {
    category: IAchievementCategory;
    selectedCategoryCode: string;
    setSelectedCategoryCode: (code: string) => void;
}

export const AchievementsCategoryListItemView: FC<AchievementCategoryListItemViewProps> = (props) => {
    const { category = null, selectedCategoryCode = null, setSelectedCategoryCode = null } = props;

    if (!category) {
        return (
            <div
                className="air-achievements-category-tile air-achievements-category-tile--empty"
                style={{
                    backgroundImage: `url(${AchievementUtilities.getAchievementImageUrl('achievement_category_bkg_empty_3')})`
                }}
                aria-hidden="true"
            />
        );
    }

    const progress = AchievementUtilities.getAchievementCategoryProgress(category);
    const maxProgress = AchievementUtilities.getAchievementCategoryMaxProgress(category);
    const getCategoryImage = AchievementUtilities.getAchievementCategoryImageUrl(category);
    const getTotalUnseen = AchievementUtilities.getAchievementCategoryTotalUnseen(category);
    const style = {
        '--air-achievement-category-background': `url(${AchievementUtilities.getAchievementImageUrl('achievement_background_active_1')})`,
        '--air-achievement-category-background-hover': `url(${AchievementUtilities.getAchievementImageUrl('achievement_background_active_2')})`
    } as CSSProperties;

    return (
        <button
            type="button"
            className={`air-achievements-category-tile${!AchievementUtilities.hasBundledCategoryImage(category) ? ' is-legacy-category' : ''}${selectedCategoryCode === category.code ? ' is-active' : ''}`}
            style={style}
            onClick={() => setSelectedCategoryCode(category.code)}
        >
            <span className="air-achievements-category-title">{AchievementUtilities.getAchievementCategoryName(category)}</span>
            <img className="air-achievements-category-art" src={getCategoryImage} alt="" draggable={false} />
            <span className="air-achievements-category-completion">
                {progress}/{maxProgress}
            </span>
            {getTotalUnseen > 0 && <span className="air-achievements-unseen-count">{getTotalUnseen}</span>}
        </button>
    );
};
