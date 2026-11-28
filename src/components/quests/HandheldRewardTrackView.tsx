import { CreateLinkEvent, GetSessionDataManager, RewardTrackData, RewardTrackPrizeData, RewardTrackTaskData } from '@octane/renderer';
import { CSSProperties, FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { FaCog } from 'react-icons/fa';
import {
    filterRewardTrackTasks,
    GetConfigurationValue,
    getRewardTrackLevelProgress,
    getRewardTrackPremiumBenefits,
    getRewardTrackPrizeState,
    getRewardTrackPrizeTooltip,
    getRewardTrackTaskHintLink,
    getRewardTrackTaskText,
    getRewardTrackText,
    localizeWithFallback,
    RewardTrackPrizeState,
    RewardTrackTaskFilter,
    resolveRewardTrackTheme,
    rewardTrackColorToCss
} from '../../api';
import { buildRewardTrackMilestones, getRewardTrackNextStop, getRewardTrackRowFill } from '../../api/quests/RewardTrackMilestones';
import checkmarkIcon from '../../assets/images/reward-track/checkmark.png';
import frankAndPiccoloImage from '../../assets/images/reward-track/frank-and-piccolo.png';
import frankTipsImage from '../../assets/images/reward-track/frank-tips.png';
import freeTrackIcon from '../../assets/images/reward-track/free-track.png';
import lockedRewardIcon from '../../assets/images/reward-track/locked-reward.png';
import pointLargeIcon from '../../assets/images/reward-track/point-large.png';
import pointSmallIcon from '../../assets/images/reward-track/point-small.png';
import premiumTrackIcon from '../../assets/images/reward-track/premium-track.png';
import rewardGiftIcon from '../../assets/images/reward-track/reward-gift.png';
import rewardGiftPremiumIcon from '../../assets/images/reward-track/reward-gift-premium.png';
import taskListIcon from '../../assets/images/reward-track/task-list.png';
import { GetRewardTrackTaskIconUrl } from '../../assets/images/reward-track/tasks';
import { LayoutAvatarImageView, LayoutCurrencyIcon } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useHandheldLayout } from '../../hooks/handheld/useHandheldLayout';
import { useRewardTrackProgressBar } from '../../hooks/quests/useRewardTrackProgressBar';
import { RewardTrackAdminView } from './RewardTrackAdminView';
import { RewardTrackRewardIcon } from './RewardTrackRewardIcon';

const FILTERS: RewardTrackTaskFilter[] = ['all', 'in_progress', 'completed'];
const FILTER_KEYS: Record<RewardTrackTaskFilter, [string, string]> = {
    all: ['reward_track.tasks.tab.all_tasks', 'All Tasks'],
    in_progress: ['reward_track.tasks.tab.in_progress', 'In Progress'],
    completed: ['reward_track.tasks.tab.completed', 'Completed']
};
/** The bars are as wide as their place; the stepper counts in thousandths of it. */
const BAR_UNITS = 1000;

type HandheldRewardTrackTab = 'rewards' | 'tasks';

const text = (key: string, fallback: string, params: string[] = null, values: string[] = null) =>
    localizeWithFallback(`octane.handheld.reward_track.${key}`, fallback, params, values);

const prefersLessMotion = (): boolean =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia('(prefers-reduced-motion: reduce)')?.matches;

/**
 * A progress bar of the phone track: the orange fill that turns green once full, moved by the stepper the desktop
 * bars use (so live progress animates the same way), but as wide as the place it is given.
 */
const HandheldRewardTrackBar: FC<{
    ratio: number;
    snapKey: string;
    levelIndex?: number;
    plain?: boolean;
}> = ({ ratio, snapKey, levelIndex = -1, plain = false }) => {
    const bar = useRewardTrackProgressBar({
        ratio,
        maxWidth: BAR_UNITS,
        animate: !prefersLessMotion(),
        snapKey,
        task: !plain,
        levelIndex
    });

    return (
        <span className="octane-handheld-rt__bar" data-complete={ratio >= 1}>
            <span
                className="octane-handheld-rt__bar-fill"
                style={{
                    width: `${bar.width / 10}%`,
                    backgroundColor: plain || bar.color === null ? undefined : rewardTrackColorToCss(bar.color)
                }}
            />
        </span>
    );
};

const Points: FC<{ value: number }> = ({ value }) => (
    <NativeTextTree>
        <span className="octane-handheld-rt__points">
            <span>{value}</span>
            <img alt="" draggable={false} src={pointSmallIcon} />
        </span>
    </NativeTextTree>
);

const Chevron: FC<{ back?: boolean }> = ({ back = false }) => (
    <svg aria-hidden="true" className="octane-handheld-rt__chevron" viewBox="0 0 16 16">
        <path d={back ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'} />
    </svg>
);

const STATE_LABELS: Record<RewardTrackPrizeState, [string, string]> = {
    claimable: ['claim', 'Claim'],
    claimed: ['claimed', 'Claimed'],
    not_enough_points: ['locked', 'Locked'],
    premium_locked: ['premium_locked', 'Premium']
};

/** One prize of a stop: the plate with the product, and what can be done with it. Only a prize that does something is a button. */
const HandheldRewardTrackPrize: FC<{
    track: RewardTrackData;
    prize: RewardTrackPrizeData;
    onClaim: (prize: RewardTrackPrizeData) => void;
    onPremium: () => void;
}> = ({ track, prize, onClaim, onPremium }) => {
    const state = getRewardTrackPrizeState(prize, track);
    const [key, fallback] = STATE_LABELS[state];
    const body = (
        <>
            <span className="octane-handheld-rt__plate">
                <RewardTrackRewardIcon extraParams={prize.extraParams} productItemTypeId={prize.productItemTypeId} rewardTypeId={prize.rewardTypeId} />
                {prize.rewardAmount > 1 && <span className="octane-handheld-rt__quantity">{prize.rewardAmount}</span>}
                {state === 'claimed' && <img alt="" className="octane-handheld-rt__mark" draggable={false} src={checkmarkIcon} />}
                {state === 'premium_locked' && <img alt="" className="octane-handheld-rt__mark" draggable={false} src={lockedRewardIcon} />}
            </span>
            <span className="octane-handheld-rt__prize-state">
                <span>{text(key, fallback)}</span>
            </span>
        </>
    );
    const canUpgrade = state === 'premium_locked' && track.hasPremiumConfig;

    if (state === 'claimable' || canUpgrade) {
        return (
            <NativeTextTree>
                <BaseButton
                    aria-label={getRewardTrackPrizeTooltip(state)}
                    className="octane-handheld-rt__prize"
                    data-premium={prize.premium}
                    data-prize={prize.id}
                    data-state={state}
                    onClick={() => (state === 'claimable' ? onClaim(prize) : onPremium())}
                >
                    {body}
                </BaseButton>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <div className="octane-handheld-rt__prize" data-premium={prize.premium} data-prize={prize.id} data-state={state}>
                {body}
            </div>
        </NativeTextTree>
    );
};

/** The purchase of the premium pass, as a card over the sheet: what it gives, what it costs, cancel and buy. */
const HandheldRewardTrackPremiumView: FC<{
    track: RewardTrackData;
    pending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ track, pending, onConfirm, onCancel }) => (
    <NativeTextTree>
        <div
            className="octane-handheld-rt__scrim"
            data-testid="handheld-rt-premium"
            onClick={(event) => event.target === event.currentTarget && !pending && onCancel()}
        >
            <div
                aria-label={localizeWithFallback('reward_track.premium.confirm.title', 'Get the premium pass')}
                className="octane-handheld-rt__confirm"
                role="dialog"
            >
                <div className="octane-handheld-rt__confirm-head">
                    <img alt="" draggable={false} src={premiumTrackIcon} />
                    <div className="octane-handheld-rt__confirm-titles">
                        <strong>{localizeWithFallback('reward_track.premium.confirm.title', 'Get the premium pass')}</strong>
                        <span>{localizeWithFallback('reward_track.rewards.premium.info', 'Extra rewards for pass holders')}</span>
                    </div>
                </div>
                <p className="octane-handheld-rt__confirm-desc">
                    {localizeWithFallback('reward_track.premium.confirm.desc', 'The premium pass unlocks the premium row of rewards for this track.')}
                </p>
                <ul className="octane-handheld-rt__benefits">
                    {getRewardTrackPremiumBenefits(track).map((benefit) => (
                        <li key={benefit}>
                            <img alt="" draggable={false} src={checkmarkIcon} />
                            <span>{benefit}</span>
                        </li>
                    ))}
                </ul>
                <div className="octane-handheld-rt__cost">
                    <span className="octane-handheld-rt__cost-label">{localizeWithFallback('catalog.purchase.confirmation.dialog.cost', 'Cost')}</span>
                    {track.costCredits > 0 && (
                        <span className="octane-handheld-rt__price">
                            <span>{track.costCredits}</span>
                            <LayoutCurrencyIcon type={-1} />
                        </span>
                    )}
                    {track.costDiamonds > 0 && (
                        <span className="octane-handheld-rt__price">
                            <span>{track.costDiamonds}</span>
                            <LayoutCurrencyIcon type={5} />
                        </span>
                    )}
                </div>
                <div className="octane-handheld-rt__confirm-buttons">
                    <BaseButton className="octane-handheld-rt__button" disabled={pending} onClick={onCancel}>
                        {localizeWithFallback('reward_track.premium.confirm.cancel', 'Cancel')}
                    </BaseButton>
                    <BaseButton className="octane-handheld-rt__button is-primary" disabled={pending} onClick={onConfirm}>
                        {localizeWithFallback('reward_track.premium.confirm.buy', 'Buy')}
                    </BaseButton>
                </div>
            </div>
        </div>
    </NativeTextTree>
);

export interface HandheldRewardTrackViewProps {
    /** The open track, or null while the tracks load. */
    track: RewardTrackData | null;
    /** Every active track (more than one gets a row of chips to switch). */
    tracks: RewardTrackData[];
    tracksVersion: number;
    filter: RewardTrackTaskFilter;
    onFilter: (filter: RewardTrackTaskFilter) => void;
    selectedTaskId: string | null;
    onSelectTask: (taskId: string) => void;
    onSelectTrack: (trackId: string) => void;
    onClaim: (prize: RewardTrackPrizeData) => void;
    /** Opens the purchase confirmation of the premium pass. */
    onPremium: () => void;
    premiumConfirm: boolean;
    premiumPending: boolean;
    onConfirmPremium: () => void;
    onCancelPremium: () => void;
    /** Staff (acc_rewardtrack): the gear in the header opens the editor inside the sheet. */
    isEditor: boolean;
    editMode: boolean;
    onEditMode: (editMode: boolean) => void;
    onPreview: (trackId: string) => void;
    /** Staff (security 4+): the track title and the task name copy their id. */
    canCopyIds: boolean;
    onCopyTrackId: (trackId: string) => void;
    onCopyTaskId: (taskId: string) => void;
    onClose: () => void;
}

/**
 * The reward track on a phone, in the Octane handheld look (HandheldRewardTrack.css). The same data and actions as the
 * desktop window (RewardTrackView owns the state and hands them in), laid out for a thumb: the shared sheet frame with
 * the points in its header, two tabs, a summary card, the prize road as a list of stops read top to bottom (free and
 * premium prize side by side at each stop, the progress rail down the left), and the tasks as cards that open their
 * levels and tip as a page of the sheet. On its side the sheet has two columns: summary | road, and tasks | details.
 */
export const HandheldRewardTrackView: FC<HandheldRewardTrackViewProps> = (props) => {
    const {
        track,
        tracks,
        tracksVersion,
        filter,
        onFilter,
        selectedTaskId,
        onSelectTask,
        onSelectTrack,
        onClaim,
        onPremium,
        premiumConfirm,
        premiumPending,
        onConfirmPremium,
        onCancelPremium,
        isEditor,
        editMode,
        onEditMode,
        onPreview,
        canCopyIds,
        onCopyTrackId,
        onCopyTaskId,
        onClose
    } = props;
    const [tab, setTab] = useState<HandheldRewardTrackTab>('rewards');
    // Upright, a task's details are a page that opens on a tap; on its side they stand beside the list.
    const [detailOpen, setDetailOpen] = useState(false);
    const landscape = useHandheldLayout().orientation === 'landscape';
    const roadRef = useRef<HTMLOListElement>(null);

    const trackId = track?.id ?? null;
    const points = track?.points ?? 0;
    const prizes = track?.prizes;
    const milestones = useMemo(() => buildRewardTrackMilestones(prizes ?? []), [prizes]);
    const stops = useMemo(() => milestones.map((milestone) => milestone.points), [milestones]);
    const nextStop = getRewardTrackNextStop(stops, points);
    const claimable = track ? (prizes ?? []).filter((prize) => prize.isClaimable(track)).sort((a, b) => a.requiredPoints - b.requiredPoints) : [];
    // The stop the eye should land on: the first with something to claim, else the one the points are heading for.
    const currentStop = claimable.length ? claimable[0].requiredPoints : nextStop.next;
    const canUpgrade = !!track && track.hasPremiumConfig && !track.premium;

    const filteredTasks = useMemo(() => filterRewardTrackTasks(track?.tasks ?? [], filter), [track, filter]);
    const selectedTask: RewardTrackTaskData = filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null;

    useEffect(() => {
        setDetailOpen(false);
    }, [trackId, filter]);

    // Opening the road brings the current stop into view (nothing moves when it already is).
    useEffect(() => {
        if (tab !== 'rewards' || !trackId) return;

        const stop = roadRef.current?.querySelector<HTMLElement>('[data-current="true"]');

        if (stop && typeof stop.scrollIntoView === 'function') stop.scrollIntoView({ block: 'nearest' });
    }, [tab, trackId]);

    const theme = resolveRewardTrackTheme(track?.theme ?? 'blue');
    const themeStyle = {
        '--rt-dark': theme.dark,
        '--rt-medium': theme.medium,
        '--rt-light': theme.light,
        '--rt-active': theme.active
    } as CSSProperties;
    const title = localizeWithFallback('reward_track.title', 'Reward Track');
    const editLabel = localizeWithFallback('reward_track.admin.open', 'Edit the reward tracks');
    const showContent = !editMode && !!track;

    const headerExtra = (
        <>
            {showContent && (
                <span
                    aria-label={`${track.points} ${localizeWithFallback('reward_track.profile.points_collected', 'Points collected')}`}
                    className="octane-handheld-rt__purse"
                >
                    <img alt="" draggable={false} src={pointSmallIcon} />
                    <span>{track.points}</span>
                </span>
            )}
            {isEditor && !editMode && !!track && (
                <BaseButton
                    aria-label={editLabel}
                    className="octane-handheld-sheet__caption-button octane-handheld-rt__gear"
                    data-testid="reward-track-admin-toggle"
                    onClick={() => onEditMode(true)}
                >
                    <FaCog />
                </BaseButton>
            )}
        </>
    );

    const renderSummary = (): ReactNode => {
        const name = getRewardTrackText(track.id, 'name', track.id);
        const description = getRewardTrackText(track.id, 'desc', '');
        const instructions = getRewardTrackText(track.id, 'info', '');

        return (
            <section className="octane-handheld-rt__summary" data-testid="handheld-rt-summary">
                <div className="octane-handheld-rt__identity">
                    <span className="octane-handheld-rt__head">
                        <LayoutAvatarImageView airMeMenu direction={3} figure={GetSessionDataManager().figure} />
                    </span>
                    <div className="octane-handheld-rt__titles">
                        {canCopyIds ? (
                            <BaseButton className="octane-handheld-rt__name is-copy" onClick={() => onCopyTrackId(track.id)}>
                                {name}
                            </BaseButton>
                        ) : (
                            <strong className="octane-handheld-rt__name">{name}</strong>
                        )}
                        {!!description && <span className="octane-handheld-rt__desc">{description}</span>}
                        {!!instructions && <span className="octane-handheld-rt__info">{instructions}</span>}
                    </div>
                </div>
                <div className="octane-handheld-rt__stats">
                    <div className="octane-handheld-rt__stat is-points">
                        <span className="octane-handheld-rt__stat-value">
                            <img alt="" draggable={false} src={pointLargeIcon} />
                            <span>{track.points}</span>
                        </span>
                        <span className="octane-handheld-rt__stat-label">
                            {localizeWithFallback('reward_track.profile.points_collected', 'Points collected')}
                        </span>
                    </div>
                    <div className="octane-handheld-rt__stat is-rewards">
                        <img alt="" draggable={false} src={checkmarkIcon} />
                        <span className="octane-handheld-rt__stat-label">
                            {localizeWithFallback(
                                'reward_track.profile.rewards_collected',
                                '%progress% / %total% rewards collected',
                                ['progress', 'total'],
                                [String(track.claimedPrizeCount), String(track.totalPrizeCount)]
                            )}
                        </span>
                    </div>
                </div>
                {!!stops.length && (
                    <div className="octane-handheld-rt__next">
                        <HandheldRewardTrackBar plain ratio={nextStop.ratio} snapKey={`${tracksVersion}:${track.id}:${nextStop.next}`} />
                        <span className="octane-handheld-rt__next-label">
                            {nextStop.next === null
                                ? text('all_unlocked', 'Every reward is unlocked')
                                : text('next_reward', '%points% points to the next reward', ['points'], [String(nextStop.remaining)])}
                        </span>
                    </div>
                )}
            </section>
        );
    };

    const renderRoad = (): ReactNode => (
        <section className="octane-handheld-rt__main is-road" data-premium={track.hasPremiumConfig}>
            <div className="octane-handheld-rt__lanes">
                <span className="octane-handheld-rt__lane is-free">
                    <img alt="" draggable={false} src={freeTrackIcon} />
                    <span>{localizeWithFallback('reward_track.rewards.free', 'Free Track')}</span>
                </span>
                {track.hasPremiumConfig &&
                    (canUpgrade ? (
                        <BaseButton className="octane-handheld-rt__lane is-premium is-upgrade" data-testid="handheld-rt-get-premium" onClick={onPremium}>
                            <img alt="" draggable={false} src={premiumTrackIcon} />
                            <span className="octane-handheld-rt__lane-copy">
                                <span>{localizeWithFallback('reward_track.rewards.premium', 'Premium')}</span>
                                <span className="octane-handheld-rt__upgrade">
                                    {localizeWithFallback('reward_track.tasks.tip_upgrade.button', 'Get Premium')}
                                </span>
                            </span>
                        </BaseButton>
                    ) : (
                        <span className="octane-handheld-rt__lane is-premium">
                            <img alt="" draggable={false} src={premiumTrackIcon} />
                            <span>{localizeWithFallback('reward_track.rewards.premium', 'Premium')}</span>
                            <img alt="" className="octane-handheld-rt__lane-check" draggable={false} src={checkmarkIcon} />
                        </span>
                    ))}
            </div>
            <ol ref={roadRef} className="octane-handheld-rt__road">
                {milestones.map((milestone, index) => (
                    <li
                        key={milestone.points}
                        className="octane-handheld-rt__stop"
                        data-current={milestone.points === currentStop}
                        data-reached={points >= milestone.points}
                        style={
                            {
                                '--hh-fill': getRewardTrackRowFill(stops, index, points)
                            } as CSSProperties
                        }
                    >
                        <span className="octane-handheld-rt__rail">
                            <span className="octane-handheld-rt__threshold">
                                <img alt="" draggable={false} src={pointSmallIcon} />
                                <span>{milestone.points}</span>
                            </span>
                        </span>
                        <div className="octane-handheld-rt__cell is-free">
                            {milestone.free.map((prize) => (
                                <HandheldRewardTrackPrize key={prize.id} prize={prize} track={track} onClaim={onClaim} onPremium={onPremium} />
                            ))}
                        </div>
                        {track.hasPremiumConfig && (
                            <div className="octane-handheld-rt__cell is-premium">
                                {milestone.premium.map((prize) => (
                                    <HandheldRewardTrackPrize key={prize.id} prize={prize} track={track} onClaim={onClaim} onPremium={onPremium} />
                                ))}
                            </div>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );

    const renderTasks = (): ReactNode => (
        <section className="octane-handheld-rt__main is-tasks">
            <div className="octane-handheld-rt__tasks-head">
                <div className="octane-handheld-rt__tasks-count">
                    <img alt="" draggable={false} src={taskListIcon} />
                    <span>
                        {localizeWithFallback(
                            'reward_track.tasks.progress',
                            '%progress% / %total% completed',
                            ['progress', 'total'],
                            [String(track.completedTaskCount), String(track.totalTaskCount)]
                        )}
                    </span>
                </div>
                <div className="octane-handheld-rt__filters">
                    {FILTERS.map((value) => (
                        <BaseButton
                            key={value}
                            aria-pressed={filter === value}
                            className="octane-handheld-rt__filter"
                            data-active={filter === value}
                            onClick={() => onFilter(value)}
                        >
                            {localizeWithFallback(FILTER_KEYS[value][0], FILTER_KEYS[value][1])}
                        </BaseButton>
                    ))}
                </div>
            </div>
            {canUpgrade ? (
                <div className="octane-handheld-rt__tip is-premium">
                    <img alt="" draggable={false} src={rewardGiftPremiumIcon} />
                    <span className="octane-handheld-rt__tip-text">
                        {localizeWithFallback('reward_track.tasks.tip_upgrade', 'Upgrade now for premium rewards and faster progress!')}
                    </span>
                    <BaseButton className="octane-handheld-rt__button is-premium" onClick={onPremium}>
                        {localizeWithFallback('reward_track.tasks.tip_upgrade.button', 'Get Premium')}
                    </BaseButton>
                </div>
            ) : (
                <div className="octane-handheld-rt__tip">
                    <img alt="" draggable={false} src={rewardGiftIcon} />
                    <span className="octane-handheld-rt__tip-text">
                        {localizeWithFallback('reward_track.tasks.tip', 'Complete tasks to earn points and unlock rewards')}
                    </span>
                    <img alt="" className="octane-handheld-rt__tip-frank" draggable={false} src={frankAndPiccoloImage} />
                </div>
            )}
            <div className="octane-handheld-rt__task-list">
                {filteredTasks.map((task) => {
                    const level = task.activeLevel;
                    const glyph = GetRewardTrackTaskIconUrl(task.actionType);

                    return (
                        <BaseButton
                            key={task.id}
                            className="octane-handheld-rt__task"
                            data-complete={task.isComplete}
                            data-selected={selectedTask?.id === task.id}
                            data-task={task.id}
                            onClick={() => {
                                onSelectTask(task.id);
                                setDetailOpen(true);
                            }}
                        >
                            <span className="octane-handheld-rt__glyph">{glyph && <img alt="" draggable={false} src={glyph} />}</span>
                            <span className="octane-handheld-rt__task-copy">
                                <span className="octane-handheld-rt__task-name">{getRewardTrackTaskText(track.id, task.id, 'name', task.id)}</span>
                                <span className="octane-handheld-rt__task-desc">{getRewardTrackTaskText(track.id, task.id, 'desc', '')}</span>
                                <span className="octane-handheld-rt__task-progress">
                                    <HandheldRewardTrackBar
                                        levelIndex={task.activeLevelIndex}
                                        ratio={task.progressRatioFor(level)}
                                        snapKey={`${tracksVersion}:${track.id}`}
                                    />
                                    <span className="octane-handheld-rt__count">
                                        {level ? getRewardTrackLevelProgress(task.progressCount, level.requiredCount) : 0} / {level ? level.requiredCount : 0}
                                    </span>
                                </span>
                            </span>
                            <span className="octane-handheld-rt__task-end">
                                {task.isComplete && <img alt="" className="octane-handheld-rt__task-check" draggable={false} src={checkmarkIcon} />}
                                <Points value={level ? level.pointsReward : 0} />
                            </span>
                            <Chevron />
                        </BaseButton>
                    );
                })}
                {!filteredTasks.length && <p className="octane-handheld-rt__empty">{text('no_tasks', 'No tasks here.')}</p>}
            </div>
        </section>
    );

    const renderDetail = (): ReactNode => {
        const hintLink = getRewardTrackTaskHintLink(
            selectedTask.actionType,
            GetConfigurationValue<string>(`reward_track.${track.id}.task.${selectedTask.id}.hint.internal_link`, '')
        );
        const glyph = GetRewardTrackTaskIconUrl(selectedTask.actionType);
        const name = getRewardTrackTaskText(track.id, selectedTask.id, 'name', selectedTask.id);
        const hint = getRewardTrackTaskText(track.id, selectedTask.id, 'hint.desc', '');

        return (
            <section className="octane-handheld-rt__detail" data-testid="handheld-rt-detail">
                <div className="octane-handheld-rt__detail-bar">
                    <BaseButton className="octane-handheld-rt__back" onClick={() => setDetailOpen(false)}>
                        <Chevron back />
                        <span>{text('back', 'Back')}</span>
                    </BaseButton>
                </div>
                <div className="octane-handheld-rt__detail-scroll">
                    <div className="octane-handheld-rt__card is-task">
                        <span className="octane-handheld-rt__glyph is-large">{glyph && <img alt="" draggable={false} src={glyph} />}</span>
                        <div className="octane-handheld-rt__titles">
                            {canCopyIds ? (
                                <BaseButton className="octane-handheld-rt__name is-copy" onClick={() => onCopyTaskId(selectedTask.id)}>
                                    {name}
                                </BaseButton>
                            ) : (
                                <strong className="octane-handheld-rt__name">{name}</strong>
                            )}
                            <span className="octane-handheld-rt__desc">{getRewardTrackTaskText(track.id, selectedTask.id, 'desc', '')}</span>
                        </div>
                    </div>
                    <div className="octane-handheld-rt__card is-levels">
                        <h3 className="octane-handheld-rt__heading">{localizeWithFallback('reward_track.levels.title', 'Levels')}</h3>
                        <ul className="octane-handheld-rt__levels">
                            {selectedTask.levels.map((level, index) => {
                                const ratio = selectedTask.progressRatioFor(level);

                                return (
                                    <li
                                        key={index}
                                        className="octane-handheld-rt__level"
                                        data-active={index === selectedTask.activeLevelIndex}
                                        data-complete={ratio >= 1}
                                    >
                                        <span className="octane-handheld-rt__level-name">
                                            {localizeWithFallback('reward_track.levels.level', 'Level %level%', ['level'], [String(index + 1)])}
                                        </span>
                                        <HandheldRewardTrackBar ratio={ratio} snapKey={`${tracksVersion}:${track.id}:${selectedTask.id}`} />
                                        <span className="octane-handheld-rt__count">
                                            {getRewardTrackLevelProgress(selectedTask.progressCount, level.requiredCount)} / {level.requiredCount}
                                        </span>
                                        <span className="octane-handheld-rt__level-check">
                                            {ratio >= 1 && <img alt="" draggable={false} src={checkmarkIcon} />}
                                        </span>
                                        <Points value={level.pointsReward} />
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    {(!!hint || !!hintLink) && (
                        <div className="octane-handheld-rt__hint">
                            <img alt="" className="octane-handheld-rt__hint-frank" draggable={false} src={frankTipsImage} />
                            <div className="octane-handheld-rt__hint-copy">
                                <strong className="octane-handheld-rt__hint-title">{localizeWithFallback('reward_track.levels.tip', 'Tip!')}</strong>
                                {!!hint && <span className="octane-handheld-rt__hint-text">{hint}</span>}
                                {hintLink && (
                                    <BaseButton
                                        className="octane-handheld-rt__button is-primary"
                                        data-testid="handheld-rt-hint-action"
                                        onClick={() => CreateLinkEvent(hintLink.link)}
                                    >
                                        {getRewardTrackTaskText(track.id, selectedTask.id, 'hint.button_text', hintLink.fallbackText)}
                                    </BaseButton>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        );
    };

    const showDetail = showContent && tab === 'tasks' && !!selectedTask && (landscape || detailOpen);

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="reward-track">
                <HandheldSheetFrame
                    activeTab={showContent ? tab : null}
                    className="octane-handheld-rt"
                    headerExtra={headerExtra}
                    icon="icon-me-rewardtrack"
                    style={themeStyle}
                    tabs={
                        showContent
                            ? [
                                  {
                                      id: 'rewards',
                                      label: text('tab.rewards', 'Rewards'),
                                      count: track.claimablePrizeCount
                                  },
                                  {
                                      id: 'tasks',
                                      label: localizeWithFallback('reward_track.tasks', 'Track Tasks')
                                  }
                              ]
                            : null
                    }
                    tabsLabel={title}
                    title={title}
                    onClose={onClose}
                    onTab={(id) => setTab(id === 'tasks' ? 'tasks' : 'rewards')}
                >
                    {editMode && isEditor && (
                        <div className="octane-handheld-rt__admin">
                            <RewardTrackAdminView onClose={() => onEditMode(false)} onPreview={onPreview} />
                        </div>
                    )}
                    {!editMode && !track && (
                        <p className="octane-handheld-rt__loading">{localizeWithFallback('reward_track.loading', 'Loading the reward track...')}</p>
                    )}
                    {showContent && (
                        <div className="octane-handheld-rt__layout" data-detail={showDetail} data-tab={tab}>
                            <div className="octane-handheld-rt__side">
                                {tracks.length > 1 && (
                                    <nav aria-label={text('tracks', 'Reward tracks')} className="octane-handheld-rt__tracks">
                                        {tracks.map((other) => (
                                            <BaseButton
                                                key={other.id}
                                                aria-pressed={other.id === track.id}
                                                className="octane-handheld-rt__track"
                                                data-active={other.id === track.id}
                                                data-track={other.id}
                                                onClick={() => other.id !== track.id && onSelectTrack(other.id)}
                                            >
                                                <span className="octane-handheld-rt__track-name">{getRewardTrackText(other.id, 'name', other.id)}</span>
                                                {other.claimablePrizeCount > 0 && (
                                                    <span className="octane-handheld-rt__badge">{other.claimablePrizeCount}</span>
                                                )}
                                            </BaseButton>
                                        ))}
                                    </nav>
                                )}
                                {renderSummary()}
                            </div>
                            {tab === 'rewards' ? renderRoad() : renderTasks()}
                            {tab === 'rewards' && claimable.length > 0 && (
                                <div className="octane-handheld-rt__actions">
                                    <BaseButton
                                        className="octane-handheld-rt__button is-primary is-claim"
                                        data-testid="handheld-rt-claim"
                                        onClick={() => onClaim(claimable[0])}
                                    >
                                        <span>{text('claim_reward', 'Claim reward')}</span>
                                        {claimable.length > 1 && <span className="octane-handheld-rt__badge">{claimable.length}</span>}
                                    </BaseButton>
                                </div>
                            )}
                            {showDetail && renderDetail()}
                        </div>
                    )}
                    {premiumConfirm && !!track && (
                        <HandheldRewardTrackPremiumView pending={premiumPending} track={track} onCancel={onCancelPremium} onConfirm={onConfirmPremium} />
                    )}
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
