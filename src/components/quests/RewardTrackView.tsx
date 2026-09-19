import { AddLinkEventTracker, CreateLinkEvent, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker, RewardTrackData, RewardTrackPrizeData, RewardTrackTaskData } from '@octane/renderer';
import { CSSProperties, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaCog } from 'react-icons/fa';
import {
    filterRewardTrackTasks,
    getPremiumBoostPercent,
    getRewardTrackPrizeState,
    getRewardTrackPrizeTooltip,
    getRewardTrackTaskHintLink,
    getRewardTrackTaskText,
    getRewardTrackText,
    localizeWithFallback,
    NotificationAlertType,
    paginatePrizeTiers,
    RewardTrackTaskFilter,
    resolveRewardTrackTheme
} from '../../api';
import checkIcon from '../../assets/images/reward-track/check.png';
import hintFrankImage from '../../assets/images/reward-track/hint-frank.png';
import milestoneReachedIcon from '../../assets/images/reward-track/milestone-reached.png';
import pointsIcon from '../../assets/images/reward-track/points.png';
import chatWithSomeoneIcon from '../../assets/images/reward-track/tasks/chat_with_someone.png';
import claimDailyTaskIcon from '../../assets/images/reward-track/tasks/claim_daily_task.png';
import completeQuestIcon from '../../assets/images/reward-track/tasks/complete_quest.png';
import enterOtherUsersRoomIcon from '../../assets/images/reward-track/tasks/enter_other_users_room.png';
import giveRespectIcon from '../../assets/images/reward-track/tasks/give_respect.png';
import placeItemIcon from '../../assets/images/reward-track/tasks/place_item.png';
import tierGiftIcon from '../../assets/images/reward-track/tier-gift.png';
import tasksIcon from '../../assets/images/reward-track/tasks.png';
import { Button, DraggableWindowPosition, LayoutAvatarImageView, LayoutBadgeImageView, LayoutCurrencyIcon, LayoutFurniIconImageView, Text } from '../../common';
import { useHasPermission, useNotification, useRewardTracks } from '../../hooks';
import { OctaneCard } from '../../layout';
import { RewardTrackAdminView } from './RewardTrackAdminView';

const CURRENCY_TYPES: Record<string, number> = { credits: -1, duckets: 0, diamonds: 5 };

/** One icon per official task action name the server sends (QuestGoalType.actionType()). */
const TASK_ICONS: Record<string, string> = {
    chat_with_someone: chatWithSomeoneIcon,
    claim_daily_task: claimDailyTaskIcon,
    complete_quest: completeQuestIcon,
    enter_other_users_room: enterOtherUsersRoomIcon,
    give_respect: giveRespectIcon,
    place_item: placeItemIcon
};

const getTaskIcon = (actionType: string): string | null => TASK_ICONS[(actionType || '').toLowerCase()] ?? null;
const FILTERS: RewardTrackTaskFilter[] = ['all', 'in_progress', 'completed'];

const RewardIcon: FC<{ rewardTypeId: string; extraParams: string; productItemTypeId: number }> = ({ rewardTypeId, extraParams, productItemTypeId }) => {
    const type = (rewardTypeId || '').toLowerCase();

    if (type in CURRENCY_TYPES) return <LayoutCurrencyIcon type={CURRENCY_TYPES[type]} className="octane-reward-track-prize-currency" />;

    if (type === 'badge') return <LayoutBadgeImageView badgeCode={extraParams} />;

    // A furni prize: the server sends its sprite id and "<s|i>:<name>" (floor or wall, then the items_base name).
    if (type === 'furni') return <LayoutFurniIconImageView productType={extraParams.startsWith('i:') ? 'i' : 's'} productClassId={productItemTypeId} className="octane-reward-track-prize-furni" />;

    return <div className="octane-reward-track-prize-generic">{rewardTypeId}</div>;
};

/** One prize of the track (prize_template 80x105): icon, quantity chip, locked / claimed markers. */
const RewardTrackPrizeView: FC<{
    column?: number;
    track: RewardTrackData;
    prize: RewardTrackPrizeData;
    onClaim: (prize: RewardTrackPrizeData) => void;
    onPremium: () => void;
}> = ({ column, track, prize, onClaim, onPremium }) => {
    const state = getRewardTrackPrizeState(prize, track);

    const onClick = () => {
        if (state === 'claimed') return;

        if (state === 'premium_locked') {
            onPremium();

            return;
        }

        if (state === 'claimable') onClaim(prize);
    };

    return (
        <div
            className={`octane-reward-track-prize octane-reward-track-prize-${state}`}
            style={column ? { gridColumn: column } : undefined}
            data-premium={prize.premium}
            title={getRewardTrackPrizeTooltip(state)}
            onClick={onClick}
        >
            <div className="octane-reward-track-prize-icon air-bitmap-surface">
                <RewardIcon rewardTypeId={prize.rewardTypeId} extraParams={prize.extraParams} productItemTypeId={prize.productItemTypeId} />
                {prize.rewardAmount > 1 && <span className="octane-reward-track-prize-amount">{prize.rewardAmount}</span>}
            </div>
            {state === 'premium_locked' && <div className="octane-reward-track-prize-marker octane-reward-track-prize-marker-locked" />}
            {state === 'claimed' && <div className="octane-reward-track-prize-marker octane-reward-track-prize-marker-claimed" />}
        </div>
    );
};

/** The premium purchase confirmation (390x352): benefits, cost, confirm / cancel. */
const RewardTrackPremiumConfirmView: FC<{ track: RewardTrackData; pending: boolean; onConfirm: () => void; onCancel: () => void }> = ({
    track,
    pending,
    onConfirm,
    onCancel
}) => (
    <OctaneCard className="octane-reward-track-premium" uniqueKey="reward-track-premium" windowPosition={DraggableWindowPosition.CENTER}>
        <OctaneCard.Header
            headerText={localizeWithFallback('reward_track.premium.confirm.title', 'Get the premium pass')}
            onCloseClick={() => !pending && onCancel()}
        />
        <OctaneCard.Content className="octane-reward-track-premium-content">
            <div className="octane-reward-track-premium-panel">
                <div className="octane-reward-track-premium-icon" />
                <Text bold>{localizeWithFallback('reward_track.rewards.premium', 'Premium')}</Text>
                <Text small>{localizeWithFallback('reward_track.rewards.premium.info', 'Extra rewards for pass holders')}</Text>
            </div>
            <div className="octane-reward-track-premium-benefits">
                <Text>{localizeWithFallback('reward_track.premium.confirm.desc', 'The premium pass unlocks the premium row of rewards for this track.')}</Text>
                {track.taskPointsBoost > 1 && (
                    <div className="octane-reward-track-premium-benefit">
                        {localizeWithFallback(
                            'reward_track.premium.confirm.benefit.boost',
                            '%percent%% more points from every task',
                            ['percent'],
                            [String(getPremiumBoostPercent(track.taskPointsBoost))]
                        )}
                    </div>
                )}
                {track.hasPremiumPrizes && (
                    <div className="octane-reward-track-premium-benefit">
                        {localizeWithFallback('reward_track.premium.confirm.benefit.rewards', 'Exclusive premium rewards')}
                    </div>
                )}
                {track.instantPoints > 0 && (
                    <div className="octane-reward-track-premium-benefit">
                        {localizeWithFallback(
                            'reward_track.premium.confirm.benefit.instant_points',
                            '%points% points right away',
                            ['points'],
                            [String(track.instantPoints)]
                        )}
                    </div>
                )}
                {track.hasPremiumTasks && (
                    <div className="octane-reward-track-premium-benefit">
                        {localizeWithFallback('reward_track.premium.confirm.benefit.tasks', 'Extra premium tasks')}
                    </div>
                )}
                {track.hasPremiumLevels && (
                    <div className="octane-reward-track-premium-benefit">
                        {localizeWithFallback('reward_track.premium.confirm.benefit.levels', 'Extra premium task levels')}
                    </div>
                )}
            </div>
            <div className="octane-reward-track-premium-cost">
                <span>{localizeWithFallback('catalog.purchase.confirmation.dialog.cost', 'Cost')}</span>
                {track.costCredits > 0 && (
                    <span className="octane-reward-track-premium-price">
                        {track.costCredits} <LayoutCurrencyIcon type={-1} />
                    </span>
                )}
                {track.costCredits > 0 && track.costDiamonds > 0 && <span>+</span>}
                {track.costDiamonds > 0 && (
                    <span className="octane-reward-track-premium-price">
                        {track.costDiamonds} <LayoutCurrencyIcon type={5} />
                    </span>
                )}
            </div>
            <div className="octane-reward-track-premium-buttons">
                <Button variant="secondary" disabled={pending} onClick={onCancel}>
                    {localizeWithFallback('reward_track.premium.confirm.cancel', 'Cancel')}
                </Button>
                <Button variant="success" disabled={pending} onClick={onConfirm}>
                    {localizeWithFallback('reward_track.premium.confirm.buy', 'Buy')}
                </Button>
            </div>
        </OctaneCard.Content>
    </OctaneCard>
);

/**
 * The official reward track window (main_xml 1103x722, `reward_track/open/<id>`): the header with the
 * avatar and the points, the prize band with its pages, the task list with its three filters and the
 * task details with the levels.
 */
export const RewardTrackView: FC<{}> = () => {
    const [trackId, setTrackId] = useState<string>(null);
    const [filter, setFilter] = useState<RewardTrackTaskFilter>('all');
    const [selectedTaskId, setSelectedTaskId] = useState<string>(null);
    const [premiumConfirm, setPremiumConfirm] = useState(false);
    // The gear opens the staff editor inside the same window (acc_rewardtrack).
    const isEditor = useHasPermission('acc_rewardtrack');
    const [editMode, setEditMode] = useState(false);
    const { tracks = [], reloadCount = 0, pendingPurchase = null, requestTracks = null, claimPrize = null, purchasePremium = null } = useRewardTracks();
    const { simpleAlert = null } = useNotification();

    const track = useMemo(() => tracks.find((existing) => existing.id === trackId) ?? null, [tracks, trackId]);

    const open = useCallback(
        (id: string) => {
            setTrackId(id);
            setEditMode(false);
            setFilter('all');
            setSelectedTaskId(null);
            requestTracks && requestTracks();
        },
        [requestTracks]
    );

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'open':
                        open(parts.length >= 3 ? parts[2] : (tracks[0]?.id ?? 'introduction'));
                        return;
                    case 'hide':
                        setTrackId(null);
                        return;
                    case 'toggle':
                        if (trackId) setTrackId(null);
                        else open(tracks[0]?.id ?? 'introduction');
                        return;
                }
            },
            eventUrlPrefix: 'reward_track/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [open, tracks, trackId]);

    useEffect(() => {
        if (trackId && !track && tracks.length && !tracks.some((existing) => existing.id === trackId)) setTrackId(tracks[0].id);
    }, [trackId, track, tracks]);

    useEffect(() => {
        if (reloadCount > 0 && trackId && simpleAlert) {
            simpleAlert(
                localizeWithFallback('reward_track.reload.desc', 'The reward track was updated and has been reloaded.'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                localizeWithFallback('reward_track.reload.title', 'Reward track updated')
            );
        }
        // the alert belongs to the reload, not to the open track
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadCount]);

    useEffect(() => {
        if (pendingPurchase === null) setPremiumConfirm(false);
    }, [pendingPurchase]);

    const theme = resolveRewardTrackTheme(track?.theme ?? 'blue');

    // The official track (talent_track's "panorama") keeps every milestone in one
    // horizontal list and scrolls it, so no reward is paginated out of reach.
    const prizeRows = useMemo(() => paginatePrizeTiers(track?.prizes ?? [], Number.MAX_SAFE_INTEGER), [track]);
    const milestones = prizeRows.milestones[0] ?? [];
    const freePrizes = prizeRows.free[0] ?? [];
    const premiumPrizes = prizeRows.premium[0] ?? [];
    // Both rows place a prize in the column of its milestone, so the same point
    // target lines up across the free and the premium row.
    const columnOf = (prize: RewardTrackPrizeData) => milestones.indexOf(prize.requiredPoints) + 1;
    const trackMaxPoints = milestones.length ? milestones[milestones.length - 1] : 0;
    const trackProgress = track && trackMaxPoints > 0 ? Math.max(0, Math.min(1, track.points / trackMaxPoints)) : 0;

    const themeStyle = {
        '--rt-dark': theme.dark,
        '--rt-medium': theme.medium,
        '--rt-light': theme.light,
        '--rt-active': theme.active,
        '--rt-prize-columns': String(milestones.length || 1)
    } as CSSProperties;

    const filteredTasks = useMemo(() => filterRewardTrackTasks(track?.tasks ?? [], filter), [track, filter]);
    const selectedTask: RewardTrackTaskData = useMemo(
        () => track?.tasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null,
        [track, selectedTaskId, filteredTasks]
    );

    const panoramaRef = useRef<HTMLDivElement>(null);
    const [panorama, setPanorama] = useState({ atEnd: true, atStart: true, claimableAfter: 0, claimableBefore: 0 });

    /** The official track badges its arrows with the claimable rewards you cannot see yet. */
    const measurePanorama = useCallback(() => {
        const panel = panoramaRef.current;

        if (!panel) return;

        const view = panel.getBoundingClientRect();
        const label = panel.querySelector('.octane-reward-track-tier-title')?.getBoundingClientRect();
        const leftEdge = label ? label.right : view.left;
        let before = 0;
        let after = 0;

        panel.querySelectorAll('.octane-reward-track-prize-claimable').forEach((node) => {
            const box = node.getBoundingClientRect();

            if (box.right <= leftEdge) before++;
            else if (box.left >= view.right) after++;
        });

        setPanorama({
            atEnd: Math.ceil(panel.scrollLeft + panel.clientWidth) >= panel.scrollWidth,
            atStart: panel.scrollLeft <= 0,
            claimableAfter: after,
            claimableBefore: before
        });
    }, []);

    useEffect(() => {
        measurePanorama();
    }, [measurePanorama, track, milestones.length]);

    const scrollPanorama = (direction: -1 | 1) => {
        const panel = panoramaRef.current;

        if (!panel) return;

        panel.scrollBy({ behavior: 'smooth', left: direction * Math.max(88, panel.clientWidth - 120) });
    };

    const hintLink = selectedTask ? getRewardTrackTaskHintLink(selectedTask.actionType) : null;

    if (!trackId) return null;

    const onClaim = (prize: RewardTrackPrizeData) => track && claimPrize && claimPrize(track.id, prize.id);
    const onPremium = () => track && track.hasPremiumConfig && !track.premium && setPremiumConfirm(true);

    const filterText = (value: RewardTrackTaskFilter) => {
        switch (value) {
            case 'in_progress':
                return localizeWithFallback('reward_track.tasks.tab.in_progress', 'In progress');
            case 'completed':
                return localizeWithFallback('reward_track.tasks.tab.completed', 'Completed');
            default:
                return localizeWithFallback('reward_track.tasks.tab.all_tasks', 'All tasks');
        }
    };

    return (
        <>
            <OctaneCard
                className="octane-reward-track"
                uniqueKey="reward-track"
                windowPosition={DraggableWindowPosition.TOP_CENTER}
                style={themeStyle}
            >
                <OctaneCard.Header
                    headerText={localizeWithFallback('reward_track.title', 'Reward track')}
                    onCloseClick={() => setTrackId(null)}
                />
                <OctaneCard.Content className="octane-reward-track-content">
                    {editMode && isEditor && (
                        <RewardTrackAdminView
                            onClose={() => setEditMode(false)}
                            onPreview={(id) => {
                                setEditMode(false);
                                open(id);
                            }}
                        />
                    )}
                    {!editMode && !track && <Text center>{localizeWithFallback('reward_track.loading', 'Loading the reward track...')}</Text>}
                    {!editMode && track && (
                        <>
                            <div className="octane-reward-track-header">
                                {isEditor && (
                                    <button
                                        type="button"
                                        className="octane-reward-track-admin-toggle"
                                        title={localizeWithFallback('reward_track.admin.open', 'Edit the reward tracks')}
                                        data-testid="reward-track-admin-toggle"
                                        onClick={() => setEditMode(true)}
                                    >
                                        <FaCog />
                                    </button>
                                )}
                                <div className="octane-reward-track-profile">
                                    <LayoutAvatarImageView figure={GetSessionDataManager().figure} direction={2} className="octane-reward-track-avatar" />
                                    <div className="octane-reward-track-info">
                                        <div className="octane-reward-track-title">{getRewardTrackText(track.id, 'name', track.id)}</div>
                                        <Text small>{getRewardTrackText(track.id, 'desc', '')}</Text>
                                        <Text small>{getRewardTrackText(track.id, 'info', '')}</Text>
                                    </div>
                                    <div className="octane-reward-track-points">
                                        <span className="octane-reward-track-points-value">
                                            <img src={pointsIcon} alt="" className="octane-reward-track-points-icon" draggable={false} />
                                            {track.points}
                                        </span>
                                        <span className="octane-reward-track-points-label">
                                            {localizeWithFallback('reward_track.profile.points_collected', 'points collected')}
                                        </span>
                                    </div>
                                    <div className="octane-reward-track-collected">
                                        <img src={checkIcon} alt="" className="octane-reward-track-check" draggable={false} />
                                        {localizeWithFallback(
                                            'reward_track.profile.rewards_collected',
                                            '%progress% / %total% rewards collected',
                                            ['progress', 'total'],
                                            [String(track.claimedPrizeCount), String(track.totalPrizeCount)]
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="octane-reward-track-scroll"
                                    data-side="prev"
                                    disabled={panorama.atStart}
                                    onClick={() => scrollPanorama(-1)}
                                    aria-label={localizeWithFallback('reward_track.rewards.previous', 'Earlier rewards')}
                                >
                                    {'«'}
                                    {panorama.claimableBefore > 0 && <span className="octane-reward-track-scroll-badge">{panorama.claimableBefore}</span>}
                                </button>
                                <div className="octane-reward-track-rewards" ref={panoramaRef} onScroll={measurePanorama}>
                                    <div className="octane-reward-track-tier octane-reward-track-tier-free">
                                        <span className="octane-reward-track-tier-title">
                                            <img src={tierGiftIcon} alt="" className="octane-reward-track-tier-icon" draggable={false} />
                                            <span>{localizeWithFallback('reward_track.rewards.free', 'Free')}</span>
                                        </span>
                                        <div className="octane-reward-track-tier-prizes">
                                            {freePrizes.map((prize) => (
                                                <RewardTrackPrizeView
                                                    key={prize.id}
                                                    column={columnOf(prize)}
                                                    track={track}
                                                    prize={prize}
                                                    onClaim={onClaim}
                                                    onPremium={onPremium}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="octane-reward-track-bar-row">
                                        <span className="octane-reward-track-lane-spacer" aria-hidden="true" />
                                        <div className="octane-reward-track-bar-lane">
                                            <div className="octane-reward-track-bar">
                                                <div className="octane-reward-track-bar-progress" style={{ width: `${Math.round(trackProgress * 100)}%` }} />
                                            </div>
                                            {milestones.map((milestone, index) =>
                                                track.points >= milestone ? (
                                                    <img
                                                        key={milestone}
                                                        src={milestoneReachedIcon}
                                                        alt=""
                                                        draggable={false}
                                                        className="octane-reward-track-milestone-mark"
                                                        style={{ gridColumn: index + 1 }}
                                                    />
                                                ) : (
                                                    <span key={milestone} className="octane-reward-track-milestone-dot" style={{ gridColumn: index + 1 }} />
                                                )
                                            )}
                                        </div>
                                    </div>
                                    <div className="octane-reward-track-tier octane-reward-track-tier-premium" data-locked={!track.premium}>
                                        <span className="octane-reward-track-tier-title">
                                            <img src={tierGiftIcon} alt="" className="octane-reward-track-tier-icon" draggable={false} />
                                            <span>
                                                {localizeWithFallback('reward_track.rewards.premium', 'Premium')}
                                                <small>{localizeWithFallback('reward_track.rewards.premium.info', 'Extra rewards for pass holders')}</small>
                                            </span>
                                        </span>
                                        <div className="octane-reward-track-tier-prizes">
                                            {premiumPrizes.map((prize) => (
                                                <RewardTrackPrizeView
                                                    key={prize.id}
                                                    column={columnOf(prize)}
                                                    track={track}
                                                    prize={prize}
                                                    onClaim={onClaim}
                                                    onPremium={onPremium}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="octane-reward-track-axis">
                                        <span className="octane-reward-track-lane-spacer" aria-hidden="true" />
                                        <div className="octane-reward-track-axis-values">
                                            {milestones.map((milestone, index) => (
                                                <span key={milestone} data-reached={track.points >= milestone} style={{ gridColumn: index + 1 }}>
                                                    {milestone}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="octane-reward-track-scroll"
                                    data-side="next"
                                    disabled={panorama.atEnd}
                                    onClick={() => scrollPanorama(1)}
                                    aria-label={localizeWithFallback('reward_track.rewards.next', 'Later rewards')}
                                >
                                    {'»'}
                                    {panorama.claimableAfter > 0 && <span className="octane-reward-track-scroll-badge">{panorama.claimableAfter}</span>}
                                </button>
                            </div>
                            <div className="octane-reward-track-body">
                                <div className="octane-reward-track-tasks">
                                    <div className="octane-reward-track-tasks-header">
                                        <span className="octane-reward-track-tasks-title">
                                            <img src={tasksIcon} alt="" className="octane-reward-track-tasks-icon" draggable={false} />
                                            {localizeWithFallback('reward_track.tasks', 'Tasks')}
                                        </span>
                                        <span className="octane-reward-track-tasks-progress">
                                            {localizeWithFallback(
                                                'reward_track.tasks.progress',
                                                '%progress% / %total% completed',
                                                ['progress', 'total'],
                                                [String(track.completedTaskCount), String(track.totalTaskCount)]
                                            )}
                                        </span>
                                    </div>
                                    <div className="octane-reward-track-filters">
                                        {FILTERS.map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                className="octane-reward-track-filter"
                                                data-active={filter === value}
                                                onClick={() => setFilter(value)}
                                            >
                                                {filterText(value)}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="octane-reward-track-task-list">
                                        {filteredTasks.map((task) => {
                                            const level = task.activeLevel;

                                            return (
                                                <div
                                                    key={task.id}
                                                    className="octane-reward-track-task"
                                                    data-selected={selectedTask?.id === task.id}
                                                    data-complete={task.isComplete}
                                                    onClick={() => setSelectedTaskId(task.id)}
                                                >
                                                    <div className="reward-track-task-icon">
                                                        {getTaskIcon(task.actionType) && (
                                                            <img className="reward-track-task-image" src={getTaskIcon(task.actionType)} alt="" draggable={false} />
                                                        )}
                                                    </div>
                                                    <div className="octane-reward-track-task-texts">
                                                        <div className="font-bold">{getRewardTrackTaskText(track.id, task.id, 'name', task.id)}</div>
                                                        <Text small>{getRewardTrackTaskText(track.id, task.id, 'desc', '')}</Text>
                                                        <div className="octane-reward-track-task-bar">
                                                            <div
                                                                className="octane-reward-track-task-bar-progress"
                                                                style={{ width: `${Math.round(task.progressRatioFor(level) * 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="octane-reward-track-task-progress">
                                                            {task.progressCount} / {level ? level.requiredCount : 0}
                                                        </span>
                                                    </div>
                                                    <div className="octane-reward-track-task-reward">
                                                        {level ? level.pointsReward : 0}
                                                        <img src={pointsIcon} alt="" className="octane-reward-track-points-icon" draggable={false} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {(!track.hasPremiumConfig || track.premium) && (
                                        <div className="octane-reward-track-tip">
                                            {localizeWithFallback('reward_track.tasks.tip', 'Complete tasks to collect points and unlock the rewards!')}
                                        </div>
                                    )}
                                    {track.hasPremiumConfig && !track.premium && (
                                        <div className="octane-reward-track-tip octane-reward-track-tip-premium">
                                            <img src={tierGiftIcon} alt="" className="octane-reward-track-tip-icon" draggable={false} />
                                            <span>
                                                {localizeWithFallback(
                                                    'reward_track.tasks.tip_upgrade',
                                                    'Get the premium pass for more points and exclusive rewards!'
                                                )}
                                            </span>
                                            <Button variant="primary" onClick={onPremium}>
                                                {localizeWithFallback('reward_track.tasks.tip_upgrade.button', 'Upgrade')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="octane-reward-track-task-info">
                                    {selectedTask && (
                                        <>
                                            <div className="octane-reward-track-task-info-header">
                                                <div className="reward-track-task-icon octane-reward-track-task-icon-large">
                                                    {getTaskIcon(selectedTask.actionType) && (
                                                        <img className="reward-track-task-image" src={getTaskIcon(selectedTask.actionType)} alt="" draggable={false} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="octane-reward-track-task-info-name">
                                                        {getRewardTrackTaskText(track.id, selectedTask.id, 'name', selectedTask.id)}
                                                    </div>
                                                    <Text>{getRewardTrackTaskText(track.id, selectedTask.id, 'desc', '')}</Text>
                                                </div>
                                            </div>
                                            <div className="octane-reward-track-levels-title">{localizeWithFallback('reward_track.levels.title', 'Levels')}</div>
                                            <div className="octane-reward-track-levels">
                                                {selectedTask.levels.map((level, index) => {
                                                    const ratio = selectedTask.progressRatioFor(level);

                                                    return (
                                                        <div
                                                            key={index}
                                                            className="octane-reward-track-level"
                                                            data-active={index === selectedTask.activeLevelIndex}
                                                        >
                                                            <span className="octane-reward-track-level-name">
                                                                {localizeWithFallback(
                                                                    'reward_track.levels.level',
                                                                    'Level %level%',
                                                                    ['level'],
                                                                    [String(index + 1)]
                                                                )}
                                                            </span>
                                                            <div className="octane-reward-track-task-bar">
                                                                <div
                                                                    className="octane-reward-track-task-bar-progress"
                                                                    style={{ width: `${Math.round(ratio * 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="octane-reward-track-task-progress">
                                                                {selectedTask.progressCount} / {level.requiredCount}
                                                            </span>
                                                            {ratio >= 1 && <img src={checkIcon} alt="" className="octane-reward-track-check" draggable={false} />}
                                                            <span className="octane-reward-track-task-reward">
                                                                {level.pointsReward}
                                                                <img src={pointsIcon} alt="" className="octane-reward-track-points-icon" draggable={false} />
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="octane-reward-track-hint">
                                                <img src={hintFrankImage} alt="" className="octane-reward-track-hint-image" draggable={false} />
                                                <div className="octane-reward-track-hint-texts">
                                                    <div className="font-bold">{localizeWithFallback('reward_track.levels.tip', 'Tip')}</div>
                                                    <Text small>{getRewardTrackTaskText(track.id, selectedTask.id, 'hint.desc', '')}</Text>
                                                </div>
                                                {hintLink && (
                                                    <Button variant="primary" onClick={() => CreateLinkEvent(hintLink.link)}>
                                                        {getRewardTrackTaskText(track.id, selectedTask.id, 'hint.button_text', hintLink.fallbackText)}
                                                    </Button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </OctaneCard.Content>
            </OctaneCard>
            {premiumConfirm && track && (
                <RewardTrackPremiumConfirmView
                    track={track}
                    pending={pendingPurchase === track.id}
                    onConfirm={() => purchasePremium && purchasePremium(track.id)}
                    onCancel={() => setPremiumConfirm(false)}
                />
            )}
        </>
    );
};
