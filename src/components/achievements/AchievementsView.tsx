import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { AchievementUtilities, LocalizeText } from '../../api';
import { DraggableWindowPosition } from '../../common';
import { useAchievements } from '../../hooks';
import { OctaneCard } from '../../layout';
import { AchievementCategoryView } from './AchievementCategoryView';
import { AirAchievementProgressBar } from './AirAchievementProgressBar';
import { AchievementsCategoryListView } from './category-list';

export const AchievementsView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const {
        achievementCategories = [],
        selectedCategoryCode = null,
        setSelectedCategoryCode = null,
        achievementScore = 0,
        getProgress = 0,
        getMaxProgress = 0,
        selectedCategory = null
    } = useAchievements();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        return;
                }
            },
            eventUrlPrefix: 'achievements/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    if (!isVisible) return null;

    return (
        <OctaneCard
            className="octane-achievements-air"
            uniqueKey="achievements"
            windowPosition={DraggableWindowPosition.TOP_CENTER}
            offsetTop={-30}
            data-view={selectedCategory ? 'category' : 'categories'}
        >
            <OctaneCard.Header headerText={LocalizeText('inventory.achievements')} onCloseClick={() => setIsVisible(false)} />
            <OctaneCard.Content className="air-achievements-content">
                {!selectedCategory && (
                    <>
                        <AchievementsCategoryListView
                            categories={achievementCategories}
                            selectedCategoryCode={selectedCategoryCode}
                            setSelectedCategoryCode={setSelectedCategoryCode}
                        />
                        <div className="air-achievements-category-footer">
                            <AirAchievementProgressBar
                                className="air-achievements-total-progress"
                                width={246}
                                maxProgress={getMaxProgress}
                                progress={getProgress}
                                text={LocalizeText(
                                    'achievements.categories.totalprogress',
                                    ['progress', 'limit'],
                                    [getProgress.toString(), getMaxProgress.toString()]
                                )}
                            />
                            <div className="air-achievements-score">
                                {LocalizeText('achievements.categories.score', ['score'], [achievementScore.toString()])}
                            </div>
                        </div>
                    </>
                )}
                {selectedCategory && (
                    <>
                        <div className="air-achievements-category-header">
                            <button
                                type="button"
                                className="air-achievements-back"
                                onClick={() => setSelectedCategoryCode(null)}
                                aria-label={LocalizeText('generic.back')}
                            />
                            <div className="air-achievements-category-name">{LocalizeText(`quests.${selectedCategory.code}.name`)}</div>
                            <div className="air-achievements-category-progress">
                                {LocalizeText(
                                    'achievements.details.categoryprogress',
                                    ['progress', 'limit'],
                                    [selectedCategory.getProgress().toString(), selectedCategory.getMaxProgress().toString()]
                                )}
                            </div>
                            <img
                                className="air-achievements-category-icon"
                                src={AchievementUtilities.getAchievementCategoryImageUrl(selectedCategory, null, true)}
                                alt=""
                                draggable={false}
                            />
                        </div>
                        <AchievementCategoryView category={selectedCategory} />
                    </>
                )}
            </OctaneCard.Content>
        </OctaneCard>
    );
};
