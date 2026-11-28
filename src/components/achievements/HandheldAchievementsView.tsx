import { AchievementData } from '@octane/renderer';
import { CSSProperties, FC, useState } from 'react';
import {
    AchievementUtilities,
    getAchievementLevelRatio,
    getAchievementScoreText,
    getAchievementShowsProgress,
    getAchievementShowsReward,
    getProgressRatio,
    IAchievementCategory,
    LocalizeBadgeDescription,
    LocalizeBadgeName,
    LocalizeText,
    localizeWithFallback
} from '../../api';
import { LayoutCurrencyIcon } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useHandheldLayout } from '../../hooks/handheld/useHandheldLayout';
import { AchievementBadgeView } from './AchievementBadgeView';

/** A bar of the phone layout: the share done as `--hh-fill`, so a change slides over (HandheldAchievements.css). */
const Bar: FC<{ ratio: number; className?: string }> = ({ ratio, className = '' }) => (
    <span
        aria-hidden="true"
        className={`octane-handheld-achievements__bar ${className}`.trim()}
        style={{ '--hh-fill': `${Math.round(Math.min(1, Math.max(0, ratio)) * 1000) / 10}%` } as CSSProperties}
    >
        <span className="octane-handheld-achievements__bar-fill" />
    </span>
);

const Chevron: FC<{ back?: boolean }> = ({ back = false }) => (
    <svg aria-hidden="true" className="octane-handheld-achievements__chevron" viewBox="0 0 16 16">
        <path d={back ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'} />
    </svg>
);

const levelText = (achievement: AchievementData): string =>
    LocalizeText(
        'achievements.details.level',
        ['level', 'limit'],
        [AchievementUtilities.getAchievementLevel(achievement).toString(), achievement.levelCount.toString()]
    );

/** What the next level gives: its points and the currency they are in. */
const Reward: FC<{ achievement: AchievementData; withLabel?: boolean }> = ({ achievement, withLabel = false }) => (
    <span className="octane-handheld-achievements__reward">
        {withLabel && <span className="octane-handheld-achievements__reward-label">{LocalizeText('achievements.details.reward')}</span>}
        <strong>{achievement.levelRewardPoints}</strong>
        <LayoutCurrencyIcon className="octane-handheld-achievements__currency" type={achievement.levelRewardPointType} />
    </span>
);

/** A category as a tile: its art, name, how many levels of it are done, and its unseen count. */
const CategoryTile: FC<{ category: IAchievementCategory; onSelect: (code: string) => void }> = ({ category, onSelect }) => {
    const progress = AchievementUtilities.getAchievementCategoryProgress(category);
    const maxProgress = AchievementUtilities.getAchievementCategoryMaxProgress(category);
    const unseen = AchievementUtilities.getAchievementCategoryTotalUnseen(category);
    const done = maxProgress > 0 && progress >= maxProgress;

    return (
        <BaseButton
            className="octane-handheld-achievements__tile"
            data-done={done || undefined}
            data-testid={`achievement-category-${category.code}`}
            onClick={() => onSelect(category.code)}
        >
            <span className="octane-handheld-achievements__tile-art">
                <img
                    alt=""
                    draggable={false}
                    src={AchievementUtilities.getAchievementCategoryImageUrl(category)}
                    onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                    }}
                />
            </span>
            <span className="octane-handheld-achievements__tile-name">{AchievementUtilities.getAchievementCategoryName(category)}</span>
            <span className="octane-handheld-achievements__tile-progress">
                <Bar ratio={getProgressRatio(progress, maxProgress)} />
                <span className="octane-handheld-achievements__count">{`${progress}/${maxProgress}`}</span>
            </span>
            {unseen > 0 && <span className="octane-handheld-achievements__unseen">{unseen}</span>}
        </BaseButton>
    );
};

/** An achievement as a card of its category: badge, name, level, progress and the next level's reward. */
const AchievementCard: FC<{ achievement: AchievementData; active: boolean; onSelect: (achievement: AchievementData) => void }> = ({
    achievement,
    active,
    onSelect
}) => {
    const badgeCode = AchievementUtilities.getAchievementBadgeCode(achievement);
    const showProgress = getAchievementShowsProgress(achievement);
    const done = achievement.finalLevel;

    return (
        <BaseButton
            className="octane-handheld-achievements__card"
            data-active={active || undefined}
            data-done={done || undefined}
            data-started={AchievementUtilities.getAchievementHasStarted(achievement) || undefined}
            data-testid={`achievement-${achievement.achievementId}`}
            data-unseen={achievement.unseen > 0 || undefined}
            onClick={() => onSelect(achievement)}
        >
            <span className="octane-handheld-achievements__card-badge">
                <AchievementBadgeView achievement={achievement} />
            </span>
            <span className="octane-handheld-achievements__card-text">
                <span className="octane-handheld-achievements__card-name">{LocalizeBadgeName(badgeCode)}</span>
                <span className="octane-handheld-achievements__card-meta">
                    <span>{levelText(achievement)}</span>
                    {getAchievementShowsReward(achievement) && <Reward achievement={achievement} />}
                </span>
                {showProgress && (
                    <span className="octane-handheld-achievements__card-progress">
                        <Bar ratio={getAchievementLevelRatio(achievement)} />
                        <span className="octane-handheld-achievements__count">{getAchievementScoreText(achievement)}</span>
                    </span>
                )}
            </span>
            {achievement.unseen > 0 && <span aria-hidden="true" className="octane-handheld-achievements__dot" />}
            <Chevron />
        </BaseButton>
    );
};

/** One achievement in full: its big badge, name, description, level, progress and the next level's reward. */
const AchievementDetail: FC<{ achievement: AchievementData }> = ({ achievement }) => {
    const badgeCode = AchievementUtilities.getAchievementBadgeCode(achievement);
    const showProgress = getAchievementShowsProgress(achievement);

    return (
        <div className="octane-handheld-achievements__detail-card" data-done={achievement.finalLevel || undefined}>
            <span className="octane-handheld-achievements__detail-badge">
                <AchievementBadgeView achievement={achievement} scale={2} />
            </span>
            <div className="octane-handheld-achievements__detail-name">{LocalizeBadgeName(badgeCode)}</div>
            <div className="octane-handheld-achievements__detail-description">{LocalizeBadgeDescription(badgeCode)}</div>
            <div className="octane-handheld-achievements__detail-level">{levelText(achievement)}</div>
            {showProgress && (
                <div className="octane-handheld-achievements__detail-progress">
                    <Bar className="is-large" ratio={getAchievementLevelRatio(achievement)} />
                    <span className="octane-handheld-achievements__count">{getAchievementScoreText(achievement)}</span>
                </div>
            )}
            {achievement.finalLevel && (
                <div className="octane-handheld-achievements__detail-complete">
                    {localizeWithFallback('octane.handheld.achievements.completed', 'All levels completed')}
                </div>
            )}
            {getAchievementShowsReward(achievement) && <Reward withLabel achievement={achievement} />}
        </div>
    );
};

export interface HandheldAchievementsViewProps {
    /** The categories the tiles show, in AIR's order (getVisibleAchievementCategories). */
    categories: IAchievementCategory[];
    selectedCategory: IAchievementCategory | null;
    /** A category's code opens it; null goes back to the tiles (and marks the category seen, as on the desktop). */
    onSelectCategory: (code: string | null) => void;
    /** The achievements of the open category the player may see. */
    achievements: AchievementData[];
    selectedAchievement: AchievementData | null;
    onSelectAchievement: (achievementId: number) => void;
    score: number;
    progress: number;
    maxProgress: number;
    onClose: () => void;
}

/**
 * The achievements on a phone, in the phone's own look (HandheldSheetFrame, HandheldAchievements.css). The desktop frame
 * is a fixed 389 px AIR window; here the same data reads as pages: a summary card (score, total levels) over the
 * categories as tiles, a category as a page with Back listing its achievements as cards, and an achievement in full as
 * a page of its own (upright) or beside the list (on its side). AchievementsView keeps every hook and hands it down.
 */
export const HandheldAchievementsView: FC<HandheldAchievementsViewProps> = ({
    categories,
    selectedCategory,
    onSelectCategory,
    achievements,
    selectedAchievement,
    onSelectAchievement,
    score,
    progress,
    maxProgress,
    onClose
}) => {
    const { orientation } = useHandheldLayout();
    const sideBySide = orientation === 'landscape';
    // The achievement opened as a page belongs to the category it was opened in.
    const [opened, setOpened] = useState<{ category: string; id: number } | null>(null);
    const openedHere = !!selectedCategory && opened?.category === selectedCategory.code;
    const detail = selectedCategory && (sideBySide || openedHere) ? selectedAchievement : null;
    const showList = sideBySide || !detail;
    const title = LocalizeText('inventory.achievements');
    const backLabel = LocalizeText('generic.back');

    const selectAchievement = (achievement: AchievementData) => {
        onSelectAchievement(achievement.achievementId);
        if (selectedCategory) setOpened({ category: selectedCategory.code, id: achievement.achievementId });
    };

    const page = !selectedCategory ? 'categories' : detail && !sideBySide ? 'achievement' : 'category';

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="achievements">
                <HandheldSheetFrame className="octane-handheld-achievements" icon="icon-me-achievements" title={title} onClose={onClose}>
                    <div className="octane-handheld-achievements__layout" data-page={page}>
                        {!selectedCategory && (
                            <div className="octane-handheld-achievements__pane" data-testid="achievement-categories">
                                <div className="octane-handheld-achievements__summary">
                                    <div className="octane-handheld-achievements__score">
                                        {LocalizeText('achievements.categories.score', ['score'], [score.toString()])}
                                    </div>
                                    <Bar className="is-large" ratio={getProgressRatio(progress, maxProgress)} />
                                    <div className="octane-handheld-achievements__total">
                                        {LocalizeText(
                                            'achievements.categories.totalprogress',
                                            ['progress', 'limit'],
                                            [progress.toString(), maxProgress.toString()]
                                        )}
                                    </div>
                                </div>
                                <div className="octane-handheld-achievements__tiles">
                                    {categories.map((category) => (
                                        <CategoryTile key={category.code} category={category} onSelect={onSelectCategory} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {selectedCategory && showList && (
                            <div className="octane-handheld-achievements__pane" data-testid="achievement-list">
                                <BaseButton
                                    className="octane-handheld-achievements__back"
                                    onClick={() => {
                                        setOpened(null);
                                        onSelectCategory(null);
                                    }}
                                >
                                    <Chevron back />
                                    <span>{backLabel}</span>
                                </BaseButton>
                                <div className="octane-handheld-achievements__category-head">
                                    <img
                                        alt=""
                                        className="octane-handheld-achievements__category-icon"
                                        draggable={false}
                                        src={AchievementUtilities.getAchievementCategoryImageUrl(selectedCategory, true)}
                                        onError={(event) => {
                                            event.currentTarget.style.visibility = 'hidden';
                                        }}
                                    />
                                    <span className="octane-handheld-achievements__category-text">
                                        <span className="octane-handheld-achievements__category-name">
                                            {AchievementUtilities.getAchievementCategoryName(selectedCategory)}
                                        </span>
                                        <span className="octane-handheld-achievements__category-progress">
                                            <Bar
                                                ratio={getProgressRatio(
                                                    AchievementUtilities.getAchievementCategoryProgress(selectedCategory),
                                                    AchievementUtilities.getAchievementCategoryMaxProgress(selectedCategory)
                                                )}
                                            />
                                            <span className="octane-handheld-achievements__count">
                                                {LocalizeText(
                                                    'achievements.details.categoryprogress',
                                                    ['progress', 'limit'],
                                                    [
                                                        AchievementUtilities.getAchievementCategoryProgress(selectedCategory).toString(),
                                                        AchievementUtilities.getAchievementCategoryMaxProgress(selectedCategory).toString()
                                                    ]
                                                )}
                                            </span>
                                        </span>
                                    </span>
                                </div>
                                {achievements.length === 0 && (
                                    <div className="octane-handheld-achievements__empty">
                                        {localizeWithFallback('octane.handheld.achievements.empty', 'There are no achievements here yet.')}
                                    </div>
                                )}
                                {achievements.map((achievement) => (
                                    <AchievementCard
                                        key={achievement.achievementId}
                                        achievement={achievement}
                                        active={sideBySide && selectedAchievement?.achievementId === achievement.achievementId}
                                        onSelect={selectAchievement}
                                    />
                                ))}
                            </div>
                        )}
                        {detail && (
                            <div
                                className="octane-handheld-achievements__pane is-detail"
                                data-achievement={detail.achievementId}
                                data-testid="achievement-detail"
                            >
                                {!sideBySide && (
                                    <BaseButton className="octane-handheld-achievements__back" onClick={() => setOpened(null)}>
                                        <Chevron back />
                                        <span>{AchievementUtilities.getAchievementCategoryName(selectedCategory)}</span>
                                    </BaseButton>
                                )}
                                <AchievementDetail achievement={detail} />
                            </div>
                        )}
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
