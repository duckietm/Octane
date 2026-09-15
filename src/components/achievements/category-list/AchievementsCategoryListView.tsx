import { FC } from 'react';
import { IAchievementCategory } from '../../../api';
import { AchievementsCategoryListItemView } from './AchievementsCategoryListItemView';

interface AchievementsCategoryListViewProps {
    categories: IAchievementCategory[];
    selectedCategoryCode: string;
    setSelectedCategoryCode: (code: string) => void;
}

const airCategoryOrder = ['identity', 'explore', 'social', 'pets', 'games', 'room_builder', 'crackables', 'crafting', 'collectibles'];

export const AchievementsCategoryListView: FC<AchievementsCategoryListViewProps> = (props) => {
    const { categories = null, selectedCategoryCode = null, setSelectedCategoryCode = null } = props;
    const categoryPosition = (code: string) => {
        if (code === 'archive') return airCategoryOrder.length + 1;

        const position = airCategoryOrder.indexOf(code);

        return position < 0 ? airCategoryOrder.length : position;
    };
    const visibleCategories = categories
        .filter((category) => !['new', 'wired_games'].includes(category.code))
        .sort((left, right) => categoryPosition(left.code) - categoryPosition(right.code));
    const itemCount = Math.max(9, visibleCategories.length);

    return (
        <div className="air-achievements-categories">
            {Array.from({ length: itemCount }, (_, index) => {
                const category = visibleCategories[index] ?? null;

                return (
                    <AchievementsCategoryListItemView
                        key={category?.code ?? `empty-${index}`}
                        category={category}
                        selectedCategoryCode={selectedCategoryCode}
                        setSelectedCategoryCode={setSelectedCategoryCode}
                    />
                );
            })}
        </div>
    );
};
