import { GetSessionDataManager } from '@octane/renderer';
import { FC, useState } from 'react';
import {
    GetConfigurationValue,
    getAchievementBaseCode,
    getCurrentLevelIndex,
    getLevelProgress,
    getTalentLevelImageUrl,
    getTalentProductImageUrl,
    getTalentTrackProgress,
    hasTaskProgressDisplay,
    ITalentLevel,
    ITalentTask,
    ITalentTrack,
    LocalizeBadgeDescription,
    LocalizeBadgeName,
    localizeWithFallback,
    SanitizeHtml,
    TALENT_STATE_ACHIEVED,
    TALENT_STATE_IN_PROGRESS,
    TALENT_STATE_LOCKED,
    TALENT_TRACK_CITIZENSHIP
} from '../../api';
import { HANDHELD_MIN_FRAME_SCALE } from '../../api/handheld/handheldWindowFit';
import checkmarkIcon from '../../assets/images/reward-track/checkmark.png';
import lockedRewardIcon from '../../assets/images/reward-track/locked-reward.png';
import taskListIcon from '../../assets/images/reward-track/task-list.png';
import checkMark from '../../assets/images/talent/talent_check_mark_circle.png';
import citizenshipAccomplished from '../../assets/images/talent/talent_citizenship_accomplished.png';
import lockedAchievement from '../../assets/images/talent/talent_locked_achievement.png';
import vipReward from '../../assets/images/talent/talent_vip_reward.png';
import { AirModalDialog, LayoutAvatarImageView, LayoutBadgeImageView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useIsHandheld } from '../../hooks/handheld/useHandheldLayout';
import { RewardTrackMiniBar } from '../quests/RewardTrackMiniBar';
import { RewardTrackScrollList } from '../quests/RewardTrackScrollList';
import { HandheldTalentTrackView } from './HandheldTalentTrackView';
import { TalentImageView } from './TalentImageView';

export const getTalentTaskTitle = (badgeCode: string): string => LocalizeBadgeName(badgeCode).toUpperCase();

/** The task's text; a %limit% the badge texts leave open is the task's goal (its total score). */
export const getTalentTaskInstruction = (badgeCode: string, limit?: number): string => {
    const text = localizeWithFallback(`badge_instruction_${getAchievementBaseCode(badgeCode)}`, LocalizeBadgeDescription(badgeCode));

    return limit > 0 ? text.replaceAll('%limit%', String(limit)) : text;
};

/** A task's bar: full once achieved, its score share while in progress, empty while locked. */
export const getTalentTaskRatio = (task: ITalentTask): number => {
    if (task.state === TALENT_STATE_ACHIEVED) return 1;

    if (task.state !== TALENT_STATE_IN_PROGRESS || task.totalScore <= 0) return 0;

    return Math.min(1, Math.max(0, task.currentScore / task.totalScore));
};

/** The tasks a level shows (a task without a badge is not drawn, as splitTalentTasks skips it). */
export const getTalentLevelTasks = (level: ITalentLevel): ITalentTask[] => (level?.tasks ?? []).filter((task) => !!task.badgeCode);

/** The begin pane's row in the level list. */
export const TALENT_BEGIN_INDEX = -1;

// AIR formatted_text: the begin texts carry small HTML such as <br>.
const FormattedText: FC<{ className: string; text: string }> = ({ className, text }) => (
    <NativeTextTree>
        <div className={className} dangerouslySetInnerHTML={{ __html: SanitizeHtml(text) }} />
    </NativeTextTree>
);

/*
 * Bar widths, in the reward track's loading_bar style: the progress bar in the profile's progress box (368 wide),
 * the level rows (264 wide, as the reward track's 582 wide "Levels" rows narrowed to the 280px list) and the task rows
 * (428 wide, the reward track's 200px task bar).
 */
const PROGRESS_BAR_WIDTH = 342;
const LEVEL_BAR_WIDTH = 150;
const TASK_BAR_WIDTH = 200;
/** Lists: the level list (13,48 280x359) and the task list (12,216 444x193, three 61px rows every 66px). */
const LEVEL_LIST_HEIGHT = 359;
const TASK_LIST_HEIGHT = 193;

interface TalentTrackViewProps {
    track: ITalentTrack;
    onClose: () => void;
    onSelectTask: (task: ITalentTask) => void;
    onOpenTrack: (name: string) => void;
}

/** A task row, like a reward track task row: badge, title, instruction, bar, score and the state icon. */
const TalentTaskRowView: FC<{ trackName: string; task: ITalentTask; onSelect: (task: ITalentTask) => void }> = ({ trackName, task, onSelect }) => {
    const ongoing = task.state === TALENT_STATE_IN_PROGRESS;
    const locked = task.state === TALENT_STATE_LOCKED;
    const achieved = task.state === TALENT_STATE_ACHIEVED;
    const body = (
        <>
            <span className="octane-talent-task__badge">
                {locked ? <img alt="" draggable={false} src={lockedAchievement} /> : <LayoutBadgeImageView badgeCode={task.badgeCode} />}
            </span>
            <span className="octane-talent-task__title">{getTalentTaskTitle(task.badgeCode)}</span>
            <span className="octane-talent-task__description">{getTalentTaskInstruction(task.badgeCode, task.totalScore)}</span>
            <span className="octane-talent-task__bar">
                <RewardTrackMiniBar ratio={getTalentTaskRatio(task)} snapKey={`${trackName}:${task.id}`} width={TASK_BAR_WIDTH} />
            </span>
            {hasTaskProgressDisplay(task.badgeCode) && task.totalScore > 0 && (
                <span className="octane-talent-task__count">
                    {achieved ? task.totalScore : Math.min(task.currentScore, task.totalScore)} / {task.totalScore}
                </span>
            )}
            {achieved && <img alt="" className="octane-talent-task__state" draggable={false} src={checkmarkIcon} />}
            {locked && <img alt="" className="octane-talent-task__state" draggable={false} src={lockedRewardIcon} />}
        </>
    );
    const state = ongoing ? 'ongoing' : achieved ? 'achieved' : 'locked';

    if (ongoing) {
        return (
            <BaseButton className="octane-talent-task" data-state={state} type="button" onClick={() => onSelect(task)}>
                {body}
            </BaseButton>
        );
    }

    return (
        <div className="octane-talent-task" data-state={state}>
            {body}
        </div>
    );
};

/** A level's rewards (level_reward): the unlock text, then its products, VIP days and perks. */
const TalentRewardView: FC<{ trackName: string; level: ITalentLevel }> = ({ trackName, level }) => {
    const library = GetConfigurationValue<string>('image.library.url', '');
    const achieved = level.state === TALENT_STATE_ACHIEVED;
    const hasRewards = level.perks.length > 0 || level.products.length > 0;

    return (
        <div className={`octane-talent-reward ${achieved ? 'is-achieved' : 'is-locked'} ${hasRewards ? '' : 'is-empty'}`}>
            <div className="octane-talent-reward__head">
                {achieved && <span className="octane-talent-reward__unlocked">{localizeWithFallback('talent.track.common.unlocked', 'UNLOCKED')}</span>}
                <span className="octane-talent-reward__description">{localizeWithFallback(`talent.track.${trackName}.level.${level.level}.unlock`, '')}</span>
            </div>
            <img alt="" className="octane-talent-reward__state" draggable={false} src={achieved ? checkmarkIcon : lockedRewardIcon} />
            {hasRewards && (
                <div className="octane-talent-reward__list">
                    {level.products.map((product, index) =>
                        product.vipDays > 0 ? (
                            <div key={`vip-${index}`} className="octane-talent-reward__item is-vip">
                                <img alt="" draggable={false} src={vipReward} />
                                <span>{product.vipDays}</span>
                            </div>
                        ) : (
                            <div key={`product-${index}`} className="octane-talent-reward__item is-product">
                                <TalentImageView productCode={product.productCode} src={getTalentProductImageUrl(library, product.productCode)} />
                            </div>
                        )
                    )}
                    {level.perks.map((perk) => (
                        // reward_achieved / reward_locked: the perk's icon, then its name and description.
                        <div key={perk} className="octane-talent-reward__item is-perk">
                            <span className="octane-talent-reward__perk-icon">
                                <img alt="" draggable={false} src={achieved ? checkMark : lockedAchievement} />
                            </span>
                            <span className="octane-talent-reward__perk-title">{localizeWithFallback(`perk.${perk}.name`, perk)}</span>
                            <span className="octane-talent-reward__perk-description">{localizeWithFallback(`perk.${perk}.description`, '')}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/** The selected level in the detail panel: title, description, illustration, rewards and the task list. */
const TalentLevelDetailView: FC<{ trackName: string; level: ITalentLevel; onSelectTask: (task: ITalentTask) => void }> = ({
    trackName,
    level,
    onSelectTask
}) => {
    const library = GetConfigurationValue<string>('image.library.url', '');
    const tasks = getTalentLevelTasks(level);

    return (
        <>
            <TalentImageView className="octane-talent-detail__illustration" src={getTalentLevelImageUrl(library, trackName, level.level)} />
            <div className="octane-talent-detail__title">{localizeWithFallback(`talent.track.${trackName}.level.${level.level}.title`, '')}</div>
            <div className="octane-talent-detail__description">{localizeWithFallback(`talent.track.${trackName}.level.${level.level}.description`, '')}</div>
            <TalentRewardView level={level} trackName={trackName} />
            <span className="octane-talent-detail__rule" />
            <span className="octane-talent-detail__heading">{localizeWithFallback('talent.track.common.tasks.title', 'Tasks')}</span>
            <RewardTrackScrollList
                key={`${trackName}:${level.level}`}
                className="octane-talent-task-list"
                contentClassName="octane-talent-task-list__content"
                height={TASK_LIST_HEIGHT}
            >
                {tasks.map((task) => (
                    <TalentTaskRowView key={task.id} task={task} trackName={trackName} onSelect={onSelectTask} />
                ))}
            </RewardTrackScrollList>
        </>
    );
};

/**
 * The begin pane (begin_helper / begin_citizenship) in the detail panel: with citizenship on, the other tracks start
 * on the "citizenship accomplished" pane and its button opens the citizenship track; the citizenship track starts on
 * the registration.
 */
const TalentBeginDetailView: FC<{ trackName: string; citizenshipEnabled: boolean; figure: string; onOpenTrack: (name: string) => void }> = ({
    trackName,
    citizenshipEnabled,
    figure,
    onOpenTrack
}) => {
    if (citizenshipEnabled && trackName !== TALENT_TRACK_CITIZENSHIP) {
        return (
            <div className="octane-talent-begin">
                <div className="octane-talent-begin__copy">
                    <div className="octane-talent-begin__title">{localizeWithFallback(`talent.track.${trackName}.guide.begin.title`, 'Your journey')}</div>
                    <FormattedText className="octane-talent-begin__text" text={localizeWithFallback(`talent.track.${trackName}.guide.begin.description`, '')} />
                </div>
                <div className="octane-talent-begin__foot is-citizenship">
                    <img alt="" className="octane-talent-begin__emblem" draggable={false} src={citizenshipAccomplished} />
                    <span className="octane-talent-begin__label">
                        {localizeWithFallback(`talent.track.${trackName}.begin.citizenship`, 'BECOME A CITIZEN')}
                    </span>
                    <BaseButton
                        className="octane-talent-button octane-talent-begin__button"
                        type="button"
                        onClick={() => onOpenTrack(TALENT_TRACK_CITIZENSHIP)}
                    >
                        {localizeWithFallback('talent.track.citizenship.button', 'View the citizenship track')}
                    </BaseButton>
                </div>
            </div>
        );
    }

    return (
        <div className="octane-talent-begin">
            <div className="octane-talent-begin__copy">
                <div className="octane-talent-begin__title">{localizeWithFallback(`talent.track.${trackName}.begin.title`, '')}</div>
                <FormattedText className="octane-talent-begin__text" text={localizeWithFallback(`talent.track.${trackName}.begin.description`, '')} />
            </div>
            <div className="octane-talent-begin__foot is-register">
                <span className="octane-talent-begin__avatar">
                    <LayoutAvatarImageView headOnly compactHead compactHeadPadding={0} compactHeadSize={33} direction={2} figure={figure} />
                </span>
                <span className="octane-talent-begin__label">{localizeWithFallback(`talent.track.${trackName}.begin.register`, 'REGISTER AT HABBO')}</span>
                <img alt="" className="octane-talent-begin__check" draggable={false} src={checkmarkIcon} />
            </div>
        </div>
    );
};

/** One row of the level list, like the reward track's level rows: name, bar, task count and the state icon. */
const TalentLevelRowView: FC<{
    name: string;
    ratio: number;
    count: string;
    state: 'achieved' | 'current' | 'locked';
    selected: boolean;
    snapKey: string;
    onSelect: () => void;
}> = ({ name, ratio, count, state, selected, snapKey, onSelect }) => (
    <BaseButton className="octane-talent-level" data-active={selected} data-state={state} type="button" onClick={onSelect}>
        <span className="octane-talent-level__name">{name}</span>
        <span className="octane-talent-level__bar">
            <RewardTrackMiniBar ratio={ratio} snapKey={snapKey} width={LEVEL_BAR_WIDTH} />
        </span>
        {count && <span className="octane-talent-level__count">{count}</span>}
        {state === 'achieved' && <img alt="" className="octane-talent-level__state" draggable={false} src={checkmarkIcon} />}
        {state === 'locked' && <img alt="" className="octane-talent-level__state" draggable={false} src={lockedRewardIcon} />}
    </BaseButton>
);

const getLevelRowState = (level: ITalentLevel): 'achieved' | 'current' | 'locked' =>
    level.state === TALENT_STATE_ACHIEVED ? 'achieved' : level.state === TALENT_STATE_LOCKED ? 'locked' : 'current';

/**
 * Official TalentTrackController (`talent_track` layout), drawn in the reward track's visual language: a fixed AIR
 * frame with the profile strip on top (avatar, track title, the level in progress and the track's progress bar), the
 * level list on the left (the begin pane first) and the selected level on the right with its rewards and tasks. The
 * level in progress is selected when the window opens, as scrollToLevel brought it into view.
 */
export const TalentTrackView: FC<TalentTrackViewProps> = ({ track, onClose, onSelectTask, onOpenTrack }) => {
    const citizenshipEnabled = GetConfigurationValue<boolean>('talent.track.citizenship.enabled', true);
    const progress = getTalentTrackProgress(track.levels);
    const currentLevel = getCurrentLevelIndex(track.levels);
    const figure = GetSessionDataManager().figure;
    const name = track.name;
    // The selection belongs to the track it was made on; another track starts on its own level in progress.
    const [selection, setSelection] = useState<{ track: string; index: number }>(null);
    const selectedIndex = selection?.track === name ? selection.index : currentLevel;
    const selectedLevel = selectedIndex === TALENT_BEGIN_INDEX ? null : (track.levels[selectedIndex] ?? null);
    const achievedLevels = track.levels.filter((level) => level.state === TALENT_STATE_ACHIEVED).length;
    const subtitle = localizeWithFallback(`talent.track.${name}.frame.subtitle`, 'MY TALENT TRACK');
    const title = localizeWithFallback(`talent.track.${name}.frame.title`, '');
    const beginTitle =
        citizenshipEnabled && name !== TALENT_TRACK_CITIZENSHIP
            ? localizeWithFallback(`talent.track.${name}.guide.begin.title`, 'Your journey')
            : localizeWithFallback(`talent.track.${name}.begin.title`, '');
    const current = track.levels[currentLevel];
    const position = localizeWithFallback('talent.track.common.progress.position', 'You are here');
    const isHandheld = useIsHandheld();

    // Phone layout: the 800 x 580 frame cannot be read on a phone, so the track has a layout of its own there.
    if (isHandheld) return <HandheldTalentTrackView track={track} onClose={onClose} onOpenTrack={onOpenTrack} onSelectTask={onSelectTask} />;

    return (
        <NativeTextTree>
            <AirModalDialog
                caption={subtitle}
                className="octane-talent-track"
                frameStyle={3}
                handheldScale={HANDHELD_MIN_FRAME_SCALE}
                width={800}
                onBackdropClick={onClose}
                onClose={onClose}
            >
                <div className="octane-talent-track__stage">
                    <div className="octane-talent-profile">
                        <span className="octane-talent-profile__avatar">
                            <LayoutAvatarImageView direction={2} figure={figure} />
                        </span>
                        <div className="octane-talent-profile__info">
                            <div className="octane-talent-profile__title">{title || subtitle}</div>
                            {current && (
                                <div className="octane-talent-profile__position">
                                    {`${position}: ${localizeWithFallback(`talent.track.${name}.level.${current.level}.title`, '')}`}
                                </div>
                            )}
                        </div>
                        <div className="octane-talent-progress">
                            <span className="octane-talent-progress__title">
                                {localizeWithFallback(
                                    `talent.track.${name}.progress.title`,
                                    localizeWithFallback('talent.track.common.progress.title', 'YOUR PROGRESS')
                                )}
                            </span>
                            <span className="octane-talent-progress__bar" data-testid="talent-progress-bar">
                                <RewardTrackMiniBar ratio={progress} snapKey={name} width={PROGRESS_BAR_WIDTH} />
                                {track.levels.slice(1).map((level, index) => (
                                    <span
                                        key={level.level}
                                        className="octane-talent-progress__divider"
                                        style={{ left: Math.round(((index + 1) / track.levels.length) * PROGRESS_BAR_WIDTH) }}
                                    />
                                ))}
                            </span>
                            <span className="octane-talent-progress__collected">
                                <img alt="" draggable={false} src={checkmarkIcon} />
                                <span>
                                    {localizeWithFallback(
                                        'talent.track.common.levels.progress',
                                        '%progress% / %total% levels completed',
                                        ['progress', 'total'],
                                        [String(achievedLevels), String(track.levels.length)]
                                    )}
                                </span>
                            </span>
                        </div>
                    </div>
                    <div className="octane-talent-body">
                        <div className="octane-talent-levels">
                            <img alt="" className="octane-talent-levels__icon" draggable={false} src={taskListIcon} />
                            <span className="octane-talent-levels__title">{localizeWithFallback('talent.track.common.levels.title', 'Levels')}</span>
                            <RewardTrackScrollList
                                key={name}
                                className="octane-talent-level-list"
                                contentClassName="octane-talent-level-list__content"
                                height={LEVEL_LIST_HEIGHT}
                            >
                                <TalentLevelRowView
                                    count=""
                                    name={beginTitle}
                                    ratio={1}
                                    selected={selectedIndex === TALENT_BEGIN_INDEX}
                                    snapKey={`${name}:begin`}
                                    state="achieved"
                                    onSelect={() => setSelection({ track: name, index: TALENT_BEGIN_INDEX })}
                                />
                                {track.levels.map((level, index) => {
                                    const tasks = getTalentLevelTasks(level);
                                    const state = getLevelRowState(level);
                                    const done = tasks.filter((task) => task.state === TALENT_STATE_ACHIEVED).length;

                                    return (
                                        <TalentLevelRowView
                                            key={level.level}
                                            count={tasks.length ? `${state === 'achieved' ? tasks.length : done} / ${tasks.length}` : ''}
                                            name={localizeWithFallback(`talent.track.${name}.level.${level.level}.title`, '')}
                                            ratio={state === 'achieved' ? 1 : getLevelProgress(level)}
                                            selected={selectedIndex === index}
                                            snapKey={`${name}:${level.level}`}
                                            state={state}
                                            onSelect={() => setSelection({ track: name, index })}
                                        />
                                    );
                                })}
                            </RewardTrackScrollList>
                        </div>
                        <div className="octane-talent-detail" data-level={selectedLevel ? selectedLevel.level : 'begin'}>
                            {selectedLevel ? (
                                <TalentLevelDetailView level={selectedLevel} trackName={name} onSelectTask={onSelectTask} />
                            ) : (
                                <TalentBeginDetailView citizenshipEnabled={citizenshipEnabled} figure={figure} trackName={name} onOpenTrack={onOpenTrack} />
                            )}
                        </div>
                    </div>
                </div>
            </AirModalDialog>
        </NativeTextTree>
    );
};
