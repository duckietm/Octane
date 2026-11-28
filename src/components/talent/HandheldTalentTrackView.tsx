import { GetSessionDataManager } from '@octane/renderer';
import { CSSProperties, FC, useState } from 'react';
import {
    GetConfigurationValue,
    getCurrentLevelIndex,
    getLevelProgress,
    getTalentProductImageUrl,
    getTalentTrackProgress,
    hasTaskProgressDisplay,
    ITalentLevel,
    ITalentTask,
    ITalentTrack,
    localizeWithFallback,
    SanitizeHtml,
    TALENT_STATE_ACHIEVED,
    TALENT_STATE_IN_PROGRESS,
    TALENT_STATE_LOCKED,
    TALENT_TRACK_CITIZENSHIP
} from '../../api';
import checkmarkIcon from '../../assets/images/reward-track/checkmark.png';
import lockedRewardIcon from '../../assets/images/reward-track/locked-reward.png';
import citizenshipAccomplished from '../../assets/images/talent/talent_citizenship_accomplished.png';
import lockedAchievement from '../../assets/images/talent/talent_locked_achievement.png';
import vipReward from '../../assets/images/talent/talent_vip_reward.png';
import { LayoutAvatarImageView, LayoutBadgeImageView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useHandheldLayout } from '../../hooks/handheld/useHandheldLayout';
import { TalentImageView } from './TalentImageView';
import { getTalentLevelTasks, getTalentTaskInstruction, getTalentTaskRatio, getTalentTaskTitle, TALENT_BEGIN_INDEX } from './TalentTrackView';

type LevelState = 'achieved' | 'current' | 'locked';

const levelState = (level: ITalentLevel): LevelState =>
    level.state === TALENT_STATE_ACHIEVED ? 'achieved' : level.state === TALENT_STATE_LOCKED ? 'locked' : 'current';

/** A progress bar of the phone layout: the share done as `--hh-fill`. */
const Bar: FC<{ ratio: number; className?: string }> = ({ ratio, className = '' }) => (
    <span
        className={`octane-handheld-talent__bar ${className}`.trim()}
        style={{ '--hh-fill': `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` } as CSSProperties}
    >
        <span className="octane-handheld-talent__bar-fill" />
    </span>
);

const StateIcon: FC<{ state: LevelState }> = ({ state }) => {
    if (state === 'achieved') return <img alt="" className="octane-handheld-talent__state" draggable={false} src={checkmarkIcon} />;
    if (state === 'locked') return <img alt="" className="octane-handheld-talent__state" draggable={false} src={lockedRewardIcon} />;

    return null;
};

const Chevron: FC<{ back?: boolean }> = ({ back = false }) => (
    <svg aria-hidden="true" className="octane-handheld-talent__chevron" viewBox="0 0 16 16">
        <path d={back ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'} />
    </svg>
);

/** A task of a level: its badge, title and instruction, the bar and the score. A task in progress opens its help. */
const TaskRow: FC<{ task: ITalentTask; onSelect: (task: ITalentTask) => void }> = ({ task, onSelect }) => {
    const ongoing = task.state === TALENT_STATE_IN_PROGRESS;
    const locked = task.state === TALENT_STATE_LOCKED;
    const achieved = task.state === TALENT_STATE_ACHIEVED;
    const state: LevelState = ongoing ? 'current' : achieved ? 'achieved' : 'locked';
    const body = (
        <>
            <span className="octane-handheld-talent__task-badge">
                {locked ? <img alt="" draggable={false} src={lockedAchievement} /> : <LayoutBadgeImageView badgeCode={task.badgeCode} />}
            </span>
            <span className="octane-handheld-talent__task-text">
                <span className="octane-handheld-talent__task-title">{getTalentTaskTitle(task.badgeCode)}</span>
                <span className="octane-handheld-talent__task-description">{getTalentTaskInstruction(task.badgeCode, task.totalScore)}</span>
                <span className="octane-handheld-talent__task-progress">
                    <Bar ratio={getTalentTaskRatio(task)} />
                    {hasTaskProgressDisplay(task.badgeCode) && task.totalScore > 0 && (
                        <span className="octane-handheld-talent__count">
                            {achieved ? task.totalScore : Math.min(task.currentScore, task.totalScore)} / {task.totalScore}
                        </span>
                    )}
                </span>
            </span>
            {ongoing ? <Chevron /> : <StateIcon state={state} />}
        </>
    );

    if (ongoing) {
        return (
            <BaseButton
                className="octane-handheld-talent__task"
                data-state={state}
                data-testid={`talent-task-${task.id}`}
                type="button"
                onClick={() => onSelect(task)}
            >
                {body}
            </BaseButton>
        );
    }

    return (
        <div className="octane-handheld-talent__task" data-state={state} data-testid={`talent-task-${task.id}`}>
            {body}
        </div>
    );
};

/** What a level gives: the unlock text, its products, VIP days and perks. */
const Rewards: FC<{ trackName: string; level: ITalentLevel }> = ({ trackName, level }) => {
    const library = GetConfigurationValue<string>('image.library.url', '');
    const achieved = level.state === TALENT_STATE_ACHIEVED;
    const unlock = localizeWithFallback(`talent.track.${trackName}.level.${level.level}.unlock`, '');

    if (!unlock && !level.perks.length && !level.products.length) return null;

    return (
        <div className="octane-handheld-talent__rewards" data-achieved={achieved}>
            <div className="octane-handheld-talent__rewards-head">
                <span>
                    {achieved && <strong>{localizeWithFallback('talent.track.common.unlocked', 'UNLOCKED')} </strong>}
                    {unlock}
                </span>
                <StateIcon state={achieved ? 'achieved' : 'locked'} />
            </div>
            {(level.products.length > 0 || level.perks.length > 0) && (
                <div className="octane-handheld-talent__reward-list">
                    {level.products.map((product, index) =>
                        product.vipDays > 0 ? (
                            <div key={`vip-${index}`} className="octane-handheld-talent__reward is-vip">
                                <img alt="" draggable={false} src={vipReward} />
                                <span>
                                    {localizeWithFallback(
                                        'catalog.vip.item.header.days',
                                        `${product.vipDays} days`,
                                        ['num_days'],
                                        [product.vipDays.toString()]
                                    )}
                                </span>
                            </div>
                        ) : (
                            <div key={`product-${index}`} className="octane-handheld-talent__reward is-product">
                                <TalentImageView productCode={product.productCode} src={getTalentProductImageUrl(library, product.productCode)} />
                            </div>
                        )
                    )}
                    {level.perks.map((perk) => (
                        <div key={perk} className="octane-handheld-talent__reward is-perk">
                            <strong>{localizeWithFallback(`perk.${perk}.name`, perk)}</strong>
                            <span>{localizeWithFallback(`perk.${perk}.description`, '')}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/** The start of a track: its story and, with citizenship on, the way to the citizenship track. */
const Begin: FC<{ trackName: string; citizenshipEnabled: boolean; figure: string; onOpenTrack: (name: string) => void }> = ({
    trackName,
    citizenshipEnabled,
    figure,
    onOpenTrack
}) => {
    const viaCitizenship = citizenshipEnabled && trackName !== TALENT_TRACK_CITIZENSHIP;
    const title = viaCitizenship
        ? localizeWithFallback(`talent.track.${trackName}.guide.begin.title`, 'Your journey')
        : localizeWithFallback(`talent.track.${trackName}.begin.title`, '');
    const text = viaCitizenship
        ? localizeWithFallback(`talent.track.${trackName}.guide.begin.description`, '')
        : localizeWithFallback(`talent.track.${trackName}.begin.description`, '');

    return (
        <>
            <div className="octane-handheld-talent__title">{title}</div>
            {/* AIR formatted_text: the begin texts carry small HTML such as <br>. */}
            <div className="octane-handheld-talent__description" dangerouslySetInnerHTML={{ __html: SanitizeHtml(text) }} />
            {viaCitizenship ? (
                <div className="octane-handheld-talent__begin">
                    <img alt="" draggable={false} src={citizenshipAccomplished} />
                    <span>{localizeWithFallback(`talent.track.${trackName}.begin.citizenship`, 'BECOME A CITIZEN')}</span>
                    <BaseButton className="octane-handheld-talent__button" type="button" onClick={() => onOpenTrack(TALENT_TRACK_CITIZENSHIP)}>
                        {localizeWithFallback('talent.track.citizenship.button', 'View the citizenship track')}
                    </BaseButton>
                </div>
            ) : (
                <div className="octane-handheld-talent__begin">
                    <span className="octane-handheld-talent__begin-avatar">
                        <LayoutAvatarImageView headOnly compactHead compactHeadPadding={0} compactHeadSize={33} direction={2} figure={figure} />
                    </span>
                    <span>{localizeWithFallback(`talent.track.${trackName}.begin.register`, 'REGISTER AT HABBO')}</span>
                    <img alt="" className="octane-handheld-talent__state" draggable={false} src={checkmarkIcon} />
                </div>
            )}
        </>
    );
};

interface HandheldTalentTrackViewProps {
    track: ITalentTrack;
    onClose: () => void;
    onSelectTask: (task: ITalentTask) => void;
    onOpenTrack: (name: string) => void;
}

/**
 * The talent track on a phone, in the phone's own look (HandheldSheetFrame, HandheldTalent.css). The desktop frame is
 * 800 x 580 px of pixel coordinates; here the same track reads top to bottom: where the player stands and how far the
 * track is, then the levels as a list. A level opens as a page of the sheet with its rewards and tasks (upright), or
 * shows beside the list (on its side, where the level in progress is open from the start). A task in progress opens
 * its help, as on the desktop.
 */
export const HandheldTalentTrackView: FC<HandheldTalentTrackViewProps> = ({ track, onClose, onSelectTask, onOpenTrack }) => {
    const { orientation } = useHandheldLayout();
    const citizenshipEnabled = GetConfigurationValue<boolean>('talent.track.citizenship.enabled', true);
    const figure = GetSessionDataManager().figure;
    const name = track.name;
    const currentLevel = getCurrentLevelIndex(track.levels);
    // The level opened belongs to the track it was opened on; another track starts closed again.
    const [opened, setOpened] = useState<{ track: string; index: number }>(null);
    const openedIndex = opened?.track === name ? opened.index : null;
    const sideBySide = orientation === 'landscape';
    // On its side there is room for both: the level in progress is shown until another one is picked.
    const detailIndex = openedIndex ?? (sideBySide ? currentLevel : null);
    const showList = sideBySide || detailIndex === null;
    const detailLevel = detailIndex === null || detailIndex === TALENT_BEGIN_INDEX ? null : (track.levels[detailIndex] ?? null);
    const achievedLevels = track.levels.filter((level) => level.state === TALENT_STATE_ACHIEVED).length;
    const subtitle = localizeWithFallback(`talent.track.${name}.frame.subtitle`, 'MY TALENT TRACK');
    const title = localizeWithFallback(`talent.track.${name}.frame.title`, '') || subtitle;
    const levelTitle = (level: ITalentLevel) => localizeWithFallback(`talent.track.${name}.level.${level.level}.title`, '');
    const beginTitle =
        citizenshipEnabled && name !== TALENT_TRACK_CITIZENSHIP
            ? localizeWithFallback(`talent.track.${name}.guide.begin.title`, 'Your journey')
            : localizeWithFallback(`talent.track.${name}.begin.title`, '');
    const current = track.levels[currentLevel];
    const open = (index: number) => setOpened({ track: name, index });

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="talent-track">
                <HandheldSheetFrame className="octane-handheld-talent" icon="icon-me-talents" title={title} onClose={onClose}>
                    <div className="octane-handheld-talent__layout" data-page={showList ? 'list' : 'detail'}>
                        {showList && (
                            <div className="octane-handheld-talent__list" data-testid="talent-levels">
                                <div className="octane-handheld-talent__summary">
                                    {current && (
                                        <div className="octane-handheld-talent__position">
                                            {`${localizeWithFallback('talent.track.common.progress.position', 'You are here')}: ${levelTitle(current)}`}
                                        </div>
                                    )}
                                    <Bar className="is-track" ratio={getTalentTrackProgress(track.levels)} />
                                    <div className="octane-handheld-talent__collected">
                                        {localizeWithFallback(
                                            'talent.track.common.levels.progress',
                                            '%progress% / %total% levels completed',
                                            ['progress', 'total'],
                                            [String(achievedLevels), String(track.levels.length)]
                                        )}
                                    </div>
                                </div>
                                <div className="octane-handheld-talent__heading">{localizeWithFallback('talent.track.common.levels.title', 'Levels')}</div>
                                <BaseButton
                                    className="octane-handheld-talent__level"
                                    data-active={detailIndex === TALENT_BEGIN_INDEX}
                                    data-state="achieved"
                                    data-testid="talent-level-begin"
                                    type="button"
                                    onClick={() => open(TALENT_BEGIN_INDEX)}
                                >
                                    <span className="octane-handheld-talent__level-text">
                                        <span className="octane-handheld-talent__level-name">{beginTitle}</span>
                                        <Bar ratio={1} />
                                    </span>
                                    <StateIcon state="achieved" />
                                    <Chevron />
                                </BaseButton>
                                {track.levels.map((level, index) => {
                                    const tasks = getTalentLevelTasks(level);
                                    const state = levelState(level);
                                    const done = tasks.filter((task) => task.state === TALENT_STATE_ACHIEVED).length;

                                    return (
                                        <BaseButton
                                            key={level.level}
                                            className="octane-handheld-talent__level"
                                            data-active={detailIndex === index}
                                            data-state={state}
                                            data-testid={`talent-level-${level.level}`}
                                            type="button"
                                            onClick={() => open(index)}
                                        >
                                            <span className="octane-handheld-talent__level-text">
                                                <span className="octane-handheld-talent__level-name">{levelTitle(level)}</span>
                                                <span className="octane-handheld-talent__task-progress">
                                                    <Bar ratio={state === 'achieved' ? 1 : getLevelProgress(level)} />
                                                    {tasks.length > 0 && (
                                                        <span className="octane-handheld-talent__count">{`${state === 'achieved' ? tasks.length : done} / ${tasks.length}`}</span>
                                                    )}
                                                </span>
                                            </span>
                                            <StateIcon state={state} />
                                            <Chevron />
                                        </BaseButton>
                                    );
                                })}
                            </div>
                        )}
                        {detailIndex !== null && (
                            <div className="octane-handheld-talent__detail" data-level={detailLevel ? detailLevel.level : 'begin'} data-testid="talent-detail">
                                {!sideBySide && (
                                    <BaseButton className="octane-handheld-talent__back" type="button" onClick={() => setOpened(null)}>
                                        <Chevron back />
                                        <span>{localizeWithFallback('generic.back', 'Back')}</span>
                                    </BaseButton>
                                )}
                                {detailLevel ? (
                                    <>
                                        <div className="octane-handheld-talent__title">{levelTitle(detailLevel)}</div>
                                        <div className="octane-handheld-talent__description">
                                            {localizeWithFallback(`talent.track.${name}.level.${detailLevel.level}.description`, '')}
                                        </div>
                                        <Rewards level={detailLevel} trackName={name} />
                                        <div className="octane-handheld-talent__heading">
                                            {localizeWithFallback('talent.track.common.tasks.title', 'Tasks')}
                                        </div>
                                        {getTalentLevelTasks(detailLevel).map((task) => (
                                            <TaskRow key={task.id} task={task} onSelect={onSelectTask} />
                                        ))}
                                    </>
                                ) : (
                                    <Begin citizenshipEnabled={citizenshipEnabled} figure={figure} trackName={name} onOpenTrack={onOpenTrack} />
                                )}
                            </div>
                        )}
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
