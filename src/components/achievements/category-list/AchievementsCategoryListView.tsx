import { FC } from 'react';
import { getVisibleAchievementCategories, IAchievementCategory } from '../../../api';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { AchievementsCategoryListItemView } from './AchievementsCategoryListItemView';

interface AchievementsCategoryListViewProps {
    categories: IAchievementCategory[];
    selectedCategoryCode: string;
    setSelectedCategoryCode: (code: string) => void;
}

export const AchievementsCategoryListView: FC<AchievementsCategoryListViewProps> = (props) => {
    const { categories = null, selectedCategoryCode = null, setSelectedCategoryCode = null } = props;
    const visibleCategories = getVisibleAchievementCategories(categories);
    const itemCount = Math.max(9, visibleCategories.length);

    return (
        <NativeTextTree>
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
        </NativeTextTree>
    );
};
