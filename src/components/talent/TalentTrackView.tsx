import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    getPromotedTalentTrack,
    getTalentCurrentLevelIndex,
    getTalentLevelIllustrationUrl,
    getTalentLevelTextKey,
    getTalentProgressPerLevel,
    getTalentRewardProductUrl,
    getTalentTaskProgressWidth,
    getTalentTotalProgress,
    getTalentTrackTextKey,
    getVisibleTalentLevels,
    isCitizenshipEnabled,
    LocalizeBadgeDescription,
    LocalizeBadgeName,
    LocalizeText,
    localizeWithFallback,
    TALENT_STATE_COMPLETED,
    TALENT_STATE_IN_PROGRESS,
    TALENT_STATE_LOCKED,
    TALENT_TASK_SAFETY_QUIZ,
    TALENT_TRACK_CITIZENSHIP,
    TALENT_TRACK_HELPER,
    TalentTrackLevelLike,
    TalentTrackTaskLike
} from '../../api';
import { Button, LayoutAvatarImageView, LayoutBadgeImageView, Text } from '../../common';
import { useHabboWay, useSessionInfo, useTalentTrack } from '../../hooks';
import { TalentTaskProgressView } from './TalentTaskProgressView';

const PROGRESS_BAR_MARGIN = 40;
const TASK_PROGRESS_WIDTH = 48;

const TalentTaskView: FC<{ task: TalentTrackTaskLike; onOpen: (task: TalentTrackTaskLike) => void }> = ({ task, onOpen }) => {
    if (!task.badgeCode) return null;

    const ongoing = task.state === TALENT_STATE_IN_PROGRESS;
    const locked = task.state === TALENT_STATE_LOCKED;
    const isSafetyQuiz = ongoing && task.badgeCode === TALENT_TASK_SAFETY_QUIZ;

    return (
        <div
            className={`octane-talent-task octane-talent-task-${locked ? 'locked' : ongoing ? 'ongoing' : 'achieved'}`}
            title={ongoing && !isSafetyQuiz ? localizeWithFallback('talent.track.common.view.progress.tooltip', 'Your progress:') : undefined}
            onClick={() => ongoing && onOpen(task)}
        >
            <div className="octane-talent-task-border">
                {locked ? (
                    <div className="octane-talent-locked-icon" />
                ) : (
                    <LayoutBadgeImageView badgeCode={task.badgeCode} className="octane-talent-task-badge" isGrayscale={ongoing} />
                )}
                <div className="octane-talent-task-text">
                    <Text bold className="octane-talent-task-title">
                        {LocalizeBadgeName(task.badgeCode).toUpperCase()}
                    </Text>
                    <Text className="octane-talent-task-description" small wrap>
                        {LocalizeBadgeDescription(task.badgeCode)}
                    </Text>
                </div>
                {ongoing && (
                    <div className="octane-talent-task-progress">
                        <div className="octane-talent-task-progress-fg" style={{ width: `${getTalentTaskProgressWidth(task, TASK_PROGRESS_WIDTH)}px` }} />
                    </div>
                )}
            </div>
            {task.state === TALENT_STATE_COMPLETED && <div className="octane-talent-check" />}
            {isSafetyQuiz && (
                <div className="octane-talent-action-overlay">{localizeWithFallback('talent.track.action.overlay', 'START BY CLICKING HERE')}</div>
            )}
        </div>
    );
};

const TalentLevelRewardView: FC<{ trackName: string; level: TalentTrackLevelLike }> = ({ trackName, level }) => {
    const locked = level.state === TALENT_STATE_LOCKED;
    const title = localizeWithFallback(getTalentLevelTextKey(trackName, level.level, 'title'), `Level ${level.level}`);
    const perks = level.perks ?? [];
    const items = level.items ?? [];

    return (
        <div className={`octane-talent-level-reward ${locked ? 'is-locked' : 'is-unlocked'}`}>
            <div className="octane-talent-level-reward-border">
                {!locked && (
                    <Text className="octane-talent-level-reward-unlocked" small>
                        {localizeWithFallback('talent.track.common.unlocked', 'UNLOCKED')}
                    </Text>
                )}
                <Text bold className="octane-talent-level-reward-title">
                    {locked ? title : `${localizeWithFallback('talent.track.common.unlocked.level.prefix', 'New level:')} ${title}`}
                </Text>
                <Text className="octane-talent-level-reward-description" wrap>
                    {localizeWithFallback(getTalentLevelTextKey(trackName, level.level, 'unlock'), '')}
                </Text>
                {(perks.length > 0 || items.length > 0) && (
                    <div className="octane-talent-reward-list">
                        {perks.map((perkId) => (
                            <div key={perkId} className={`octane-talent-reward octane-talent-reward-perk ${locked ? 'is-locked' : 'is-achieved'}`}>
                                {locked ? <div className="octane-talent-locked-icon" /> : <div className="octane-talent-perk-image" title={perkId} />}
                                <div className="octane-talent-reward-text">
                                    <Text bold>{localizeWithFallback(`perk.${perkId}.name`, perkId)}</Text>
                                    <Text small wrap>
                                        {localizeWithFallback(`perk.${perkId}.description`, '')}
                                    </Text>
                                </div>
                            </div>
                        ))}
                        {items.map((item, index) =>
                            item.vipDays > 0 ? (
                                <div key={`vip-${index}`} className={`octane-talent-reward octane-talent-reward-vip${locked ? ' is-locked' : ''}`}>
                                    <div className="octane-talent-vip-icon" />
                                    <Text bold>{LocalizeText('catalog.vip.item.header.days', ['num_days'], [item.vipDays.toString()])}</Text>
                                </div>
                            ) : (
                                <div
                                    key={`product-${index}`}
                                    className={`octane-talent-reward octane-talent-reward-product${locked ? ' is-locked' : ''}`}
                                    title={item.productCode}
                                >
                                    <img alt={item.productCode} src={getTalentRewardProductUrl(item.productCode)} />
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
            {locked ? <div className="octane-talent-locked-stripe" /> : <div className="octane-talent-check" />}
        </div>
    );
};

const TalentLevelPaneView: FC<{
    trackName: string;
    level: TalentTrackLevelLike;
    index: number;
    onOpenTask: (task: TalentTrackTaskLike) => void;
}> = ({ trackName, level, index, onOpenTask }) => {
    const tasks = (level.tasks ?? []).filter((task) => !!task.badgeCode);
    const topTasks = tasks.filter((task, taskIndex) => taskIndex % 2 === 0);
    const bottomTasks = tasks.filter((task, taskIndex) => taskIndex % 2 === 1);
    const isBigIllustration = (trackName === TALENT_TRACK_HELPER && level.level === 8) || (trackName === TALENT_TRACK_CITIZENSHIP && level.level === 4);
    const hideIllustration = trackName === TALENT_TRACK_CITIZENSHIP && level.level === 0;

    return (
        <div className="octane-talent-level-pane" data-level-index={index}>
            <div className="octane-talent-level-separator" />
            <div className="octane-talent-level-content">
                <Text bold className="octane-talent-level-title">
                    {localizeWithFallback(getTalentLevelTextKey(trackName, level.level, 'title'), `Level ${level.level}`)}
                </Text>
                <Text className="octane-talent-level-description" wrap>
                    {localizeWithFallback(getTalentLevelTextKey(trackName, level.level, 'description'), '')}
                </Text>
                <div className="octane-talent-status-list">
                    {index > 0 && <TalentLevelRewardView level={level} trackName={trackName} />}
                    {tasks.length > 0 && (
                        <div className="octane-talent-level-task">
                            <div className="octane-talent-task-row">
                                {topTasks.map((task) => (
                                    <TalentTaskView key={task.id} task={task} onOpen={onOpenTask} />
                                ))}
                            </div>
                            <div className="octane-talent-task-row">
                                {bottomTasks.map((task) => (
                                    <TalentTaskView key={task.id} task={task} onOpen={onOpenTask} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {!hideIllustration && (
                <img
                    alt=""
                    className={`octane-talent-level-illustration${isBigIllustration ? ' is-big' : ''}`}
                    src={getTalentLevelIllustrationUrl(trackName, level.level)}
                    onError={(event) => (event.currentTarget.style.display = 'none')}
                />
            )}
        </div>
    );
};

const TalentBeginPaneView: FC<{ trackName: string; citizenship: boolean; figure: string; onOpenCitizenship: () => void }> = ({
    trackName,
    citizenship,
    figure,
    onOpenCitizenship
}) => {
    if (trackName === TALENT_TRACK_HELPER && citizenship) {
        return (
            <div className="octane-talent-begin octane-talent-begin-helper">
                <Text bold className="octane-talent-begin-title">
                    {localizeWithFallback('talent.track.helper.guide.begin.title', 'Your journey as a Guide')}
                </Text>
                <div
                    className="octane-talent-begin-description"
                    dangerouslySetInnerHTML={{
                        __html: localizeWithFallback(
                            'talent.track.helper.guide.begin.description',
                            "Everyone needs a helping hand every now and then. Pay it forward - it's worth it. :)"
                        )
                    }}
                />
                <div className="octane-talent-begin-citizenship">
                    <Text bold className="octane-talent-begin-label">
                        {localizeWithFallback('talent.track.helper.begin.citizenship', 'BECOME A CITIZEN')}
                    </Text>
                    <div className="octane-talent-citizenship-accomplished" />
                </div>
                <Button className="octane-talent-citizenship-button" variant="primary" onClick={onOpenCitizenship}>
                    {localizeWithFallback('talent.track.citizenship.button', 'See my Citizen Track')}
                </Button>
            </div>
        );
    }

    const isCitizenshipTrack = trackName === TALENT_TRACK_CITIZENSHIP;

    return (
        <div className={`octane-talent-begin octane-talent-begin-${isCitizenshipTrack ? 'citizenship' : 'helper-no-citizenship'}`}>
            <Text bold className="octane-talent-begin-title" wrap>
                {isCitizenshipTrack
                    ? localizeWithFallback('talent.track.citizenship.begin.title', 'Your path to becoming a full-fledged Habbo Citizen')
                    : localizeWithFallback('talent.track.helper.begin.title', 'Your journey as a Helper')}
            </Text>
            <div
                className="octane-talent-begin-description"
                dangerouslySetInnerHTML={{
                    __html: isCitizenshipTrack
                        ? localizeWithFallback(
                              'talent.track.citizenship.begin.description',
                              'We want you to get most out of your time in Habbo, so before venturing out on your own, please take a look at what it means to be a Habbo Citizen.'
                          )
                        : localizeWithFallback(
                              'talent.track.helper.begin.description',
                              "Everyone needs a helping hand every now and then. Pay it forward - it's worth it. :)"
                          )
                }}
            />
            <div className="octane-talent-begin-avatar">
                {figure && <LayoutAvatarImageView direction={2} figure={figure} />}
                <div className="octane-talent-check" />
            </div>
            <Text bold className="octane-talent-begin-label octane-talent-begin-register">
                {isCitizenshipTrack
                    ? localizeWithFallback('talent.track.citizenship.begin.register', 'REGISTER TO HABBO')
                    : localizeWithFallback('talent.track.helper.begin.register', 'REGISTER TO HABBO')}
            </Text>
        </div>
    );
};

/**
 * talent_track (1000x490, modal, TalentTrackController): the panorama of the levels with
 * their rewards and tasks, the level illustrations, and the progress meter with the
 * avatar needle (TalentProgressMeter). `talent/open/<track>` asks the server for a track.
 */
export const TalentTrackView: FC<{}> = () => {
    const { track = null, requestTalentTrack = null, closeTalentTrack = null } = useTalentTrack();
    const { userFigure = null } = useSessionInfo();
    const { startSafetyQuiz = null } = useHabboWay();
    const [selectedTask, setSelectedTask] = useState<TalentTrackTaskLike>(null);
    const panoramaRef = useRef<HTMLDivElement>(null);
    const meterRef = useRef<HTMLDivElement>(null);

    const citizenship = isCitizenshipEnabled();
    const levels = useMemo(() => (track ? getVisibleTalentLevels(track.name, track.levels, citizenship) : []), [track, citizenship]);
    const currentIndex = getTalentCurrentLevelIndex(levels);
    const totalProgress = getTalentTotalProgress(levels);
    const perLevel = getTalentProgressPerLevel(levels);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2 || parts[1] !== 'open') return;

                requestTalentTrack && requestTalentTrack(parts[2] && parts[2].length ? parts[2] : getPromotedTalentTrack());
            },
            eventUrlPrefix: 'talent/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [requestTalentTrack]);

    /** scrollToLevel: the pane of the level lands 20px from the left edge. */
    const scrollToLevel = useCallback((index: number) => {
        const panorama = panoramaRef.current;

        if (!panorama) return;

        if (index <= 0) {
            panorama.scrollLeft = 0;

            return;
        }

        const pane = panorama.querySelector<HTMLElement>(`[data-level-index="${index}"]`);

        if (pane) panorama.scrollLeft = Math.max(0, pane.offsetLeft - 20);
    }, []);

    useEffect(() => {
        setSelectedTask(null);

        if (!track) return;

        const frame = window.requestAnimationFrame(() => scrollToLevel(currentIndex));

        return () => window.cancelAnimationFrame(frame);
    }, [track, currentIndex, scrollToLevel]);

    const close = useCallback(() => {
        setSelectedTask(null);
        closeTalentTrack && closeTalentTrack();
    }, [closeTalentTrack]);

    const openTask = useCallback(
        (task: TalentTrackTaskLike) => {
            if (task.badgeCode === TALENT_TASK_SAFETY_QUIZ) {
                close();
                startSafetyQuiz && startSafetyQuiz();

                return;
            }

            setSelectedTask(task);
        },
        [close, startSafetyQuiz]
    );

    /** progress_container click: the edges jump to the ends, the rest to the level under the cursor. */
    const onMeterClick = (event: MouseEvent<HTMLDivElement>) => {
        const meter = meterRef.current;
        const panorama = panoramaRef.current;

        if (!meter || !panorama || !levels.length) return;

        const x = event.clientX - meter.getBoundingClientRect().left;
        const width = meter.clientWidth;

        if (x < PROGRESS_BAR_MARGIN) panorama.scrollLeft = 0;
        else if (x > width - PROGRESS_BAR_MARGIN) panorama.scrollLeft = panorama.scrollWidth;
        else scrollToLevel(Math.floor(x / Math.max(1, Math.floor(perLevel * width))));
    };

    if (!track) return null;

    const trackName = track.name;

    return (
        <div className="octane-talent-modal" onClick={close}>
            <div className="octane-talent-track" onClick={(event) => event.stopPropagation()}>
                <div className="octane-talent-track-header">
                    <div className="octane-talent-track-titles">
                        <div className="octane-talent-track-subtitle">
                            {localizeWithFallback(getTalentTrackTextKey(trackName, 'frame.subtitle'), 'MY TALENT TRACK')}
                        </div>
                        <div className="octane-talent-track-title">
                            {localizeWithFallback(getTalentTrackTextKey(trackName, 'frame.title'), 'The Habbo Way')}
                        </div>
                    </div>
                    <button
                        aria-label={localizeWithFallback('alert.close.button', 'Close')}
                        className="octane-talent-track-close"
                        type="button"
                        onClick={close}
                    />
                </div>
                <div className="octane-talent-track-frame">
                    <div ref={panoramaRef} className="octane-talent-panorama">
                        <TalentBeginPaneView
                            citizenship={citizenship}
                            figure={userFigure}
                            trackName={trackName}
                            onOpenCitizenship={() => requestTalentTrack && requestTalentTrack(TALENT_TRACK_CITIZENSHIP)}
                        />
                        {levels.map((level, index) => (
                            <TalentLevelPaneView key={`${level.level}-${index}`} index={index} level={level} trackName={trackName} onOpenTask={openTask} />
                        ))}
                        <div className="octane-talent-end-padding" />
                    </div>
                    <div className="octane-talent-mask octane-talent-mask-left" />
                    <div className="octane-talent-mask octane-talent-mask-right" />
                    <div ref={meterRef} className="octane-talent-progress-container" onClick={onMeterClick}>
                        <Text bold className="octane-talent-progress-text">
                            {localizeWithFallback(getTalentTrackTextKey(trackName, 'progress.title'), 'YOUR PROGRESS')}
                        </Text>
                        <div className="octane-talent-progress-bar octane-talent-meter">
                            <div className="octane-talent-progress-bar-achieved" style={{ width: `${totalProgress * 100}%` }} />
                            {levels.slice(1).map((level, index) => {
                                const position = (index + 1) * perLevel;

                                return (
                                    <div
                                        key={`divider-${index}`}
                                        className={`octane-talent-progress-divider ${position < totalProgress ? 'is-achieved' : 'is-unachieved'}`}
                                        style={{ left: `${position * 100}%` }}
                                    />
                                );
                            })}
                        </div>
                        <div className="octane-talent-progress-needle" style={{ left: `${totalProgress * 100}%` }}>
                            <div className="octane-talent-avatar-glow" />
                            {userFigure && <LayoutAvatarImageView className="octane-talent-needle-avatar" figure={userFigure} headOnly />}
                            <div className="octane-talent-progress-balloon">
                                {localizeWithFallback('talent.track.common.progress.position', 'You are here')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {selectedTask && (
                <div onClick={(event) => event.stopPropagation()}>
                    <TalentTaskProgressView task={selectedTask} trackName={trackName} onClose={() => setSelectedTask(null)} onCloseTrack={close} />
                </div>
            )}
        </div>
    );
};
