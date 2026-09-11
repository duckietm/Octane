import {
    AddLinkEventTracker,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RewardTrackData,
    RewardTrackPrizeData,
    RewardTrackTaskData
} from '@octane/renderer';
import { CSSProperties, FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
    filterRewardTrackTasks,
    getPremiumBoostPercent,
    getRewardTrackPrizeState,
    getRewardTrackPrizeTooltip,
    getRewardTrackTaskIconClass,
    getRewardTrackTaskText,
    getRewardTrackText,
    localizeWithFallback,
    NotificationAlertType,
    paginatePrizes,
    RewardTrackTaskFilter,
    resolveRewardTrackTheme
} from '../../api';
import { Button, DraggableWindowPosition, LayoutAvatarImageView, LayoutBadgeImageView, LayoutCurrencyIcon, Text } from '../../common';
import { useNotification, useRewardTracks } from '../../hooks';
import { OctaneCard } from '../../layout';

const PRIZES_PER_PAGE = 5;
const CURRENCY_TYPES: Record<string, number> = { credits: -1, duckets: 0, diamonds: 5 };
const FILTERS: RewardTrackTaskFilter[] = ['all', 'in_progress', 'completed'];

const RewardIcon: FC<{ rewardTypeId: string; extraParams: string }> = ({ rewardTypeId, extraParams }) => {
    const type = (rewardTypeId || '').toLowerCase();

    if (type in CURRENCY_TYPES) return <LayoutCurrencyIcon type={CURRENCY_TYPES[type]} className="octane-reward-track-prize-currency" />;

    if (type === 'badge') return <LayoutBadgeImageView badgeCode={extraParams} />;

    return <div className="octane-reward-track-prize-generic">{rewardTypeId}</div>;
};

/** One prize of the track (prize_template 80x105): icon, quantity chip, locked / claimed markers. */
const RewardTrackPrizeView: FC<{
    track: RewardTrackData;
    prize: RewardTrackPrizeData;
    onClaim: (prize: RewardTrackPrizeData) => void;
    onPremium: () => void;
}> = ({ track, prize, onClaim, onPremium }) => {
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
            data-premium={prize.premium}
            title={getRewardTrackPrizeTooltip(state)}
            onClick={onClick}
        >
            <div className="octane-reward-track-prize-icon">
                <RewardIcon rewardTypeId={prize.rewardTypeId} extraParams={prize.extraParams} />
                {prize.rewardAmount > 1 && <span className="octane-reward-track-prize-amount">{prize.rewardAmount}</span>}
            </div>
            {state === 'premium_locked' && <div className="octane-reward-track-prize-locked" />}
            {state === 'claimed' && <div className="octane-reward-track-prize-claimed" />}
            <div className="octane-reward-track-prize-points" data-reached={track.points >= prize.requiredPoints}>
                {prize.requiredPoints}
            </div>
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
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState<RewardTrackTaskFilter>('all');
    const [selectedTaskId, setSelectedTaskId] = useState<string>(null);
    const [premiumConfirm, setPremiumConfirm] = useState(false);
    const { tracks = [], reloadCount = 0, pendingPurchase = null, requestTracks = null, claimPrize = null, purchasePremium = null } = useRewardTracks();
    const { simpleAlert = null } = useNotification();

    const track = useMemo(() => tracks.find((existing) => existing.id === trackId) ?? null, [tracks, trackId]);

    const open = useCallback(
        (id: string) => {
            setTrackId(id);
            setPage(0);
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
    const themeStyle = { '--rt-dark': theme.dark, '--rt-medium': theme.medium, '--rt-light': theme.light, '--rt-active': theme.active } as CSSProperties;

    const freePages = useMemo(() => paginatePrizes(track?.prizes.filter((prize) => !prize.premium) ?? [], PRIZES_PER_PAGE), [track]);
    const premiumPages = useMemo(() => paginatePrizes(track?.prizes.filter((prize) => prize.premium) ?? [], PRIZES_PER_PAGE), [track]);
    const pageCount = Math.max(freePages.length, premiumPages.length);
    const currentPage = Math.min(page, pageCount - 1);
    const pagePrizes = [...(freePages[currentPage] ?? []), ...(premiumPages[currentPage] ?? [])];
    const pageMaxPoints = pagePrizes.reduce((max, prize) => Math.max(max, prize.requiredPoints), 0);
    const pageMinPoints =
        currentPage > 0
            ? [...(freePages[currentPage - 1] ?? []), ...(premiumPages[currentPage - 1] ?? [])].reduce((max, prize) => Math.max(max, prize.requiredPoints), 0)
            : 0;
    const pageProgress =
        track && pageMaxPoints > pageMinPoints
            ? Math.max(0, Math.min(1, (track.points - pageMinPoints) / (pageMaxPoints - pageMinPoints)))
            : track && track.points >= pageMaxPoints
              ? 1
              : 0;

    const unclaimedBefore = track
        ? [...freePages.slice(0, currentPage).flat(), ...premiumPages.slice(0, currentPage).flat()].filter((prize) => prize.isClaimable(track)).length
        : 0;
    const unclaimedAfter = track
        ? [...freePages.slice(currentPage + 1).flat(), ...premiumPages.slice(currentPage + 1).flat()].filter((prize) => prize.isClaimable(track)).length
        : 0;

    const filteredTasks = useMemo(() => filterRewardTrackTasks(track?.tasks ?? [], filter), [track, filter]);
    const selectedTask: RewardTrackTaskData = useMemo(
        () => track?.tasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null,
        [track, selectedTaskId, filteredTasks]
    );

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
                offsetTop={-30}
                style={themeStyle}
            >
                <OctaneCard.Header
                    headerText={track ? getRewardTrackText(track.id, 'name', 'Reward track') : localizeWithFallback('reward_track.loading', 'Reward track')}
                    onCloseClick={() => setTrackId(null)}
                />
                <OctaneCard.Content className="octane-reward-track-content">
                    {!track && <Text center>{localizeWithFallback('reward_track.loading', 'Loading the reward track...')}</Text>}
                    {track && (
                        <>
                            <div className="octane-reward-track-header">
                                <div className="octane-reward-track-profile">
                                    <LayoutAvatarImageView figure={GetSessionDataManager().figure} direction={2} className="octane-reward-track-avatar" />
                                    <div className="octane-reward-track-info">
                                        <div className="octane-reward-track-title">{getRewardTrackText(track.id, 'name', track.id)}</div>
                                        <Text small>{getRewardTrackText(track.id, 'desc', '')}</Text>
                                        <Text small>{getRewardTrackText(track.id, 'info', '')}</Text>
                                    </div>
                                    <div className="octane-reward-track-points">
                                        <span className="octane-reward-track-points-value">{track.points}</span>
                                        <span className="octane-reward-track-points-label">
                                            {localizeWithFallback('reward_track.profile.points_collected', 'points collected')}
                                        </span>
                                    </div>
                                    <div className="octane-reward-track-collected">
                                        {localizeWithFallback(
                                            'reward_track.profile.rewards_collected',
                                            '%progress% / %total% rewards collected',
                                            ['progress', 'total'],
                                            [String(track.claimedPrizeCount), String(track.totalPrizeCount)]
                                        )}
                                    </div>
                                </div>
                                <div className="octane-reward-track-rewards">
                                    <div className="octane-reward-track-tier octane-reward-track-tier-free">
                                        <span className="octane-reward-track-tier-title">{localizeWithFallback('reward_track.rewards.free', 'Free')}</span>
                                        <div className="octane-reward-track-tier-prizes">
                                            {(freePages[currentPage] ?? []).map((prize) => (
                                                <RewardTrackPrizeView key={prize.id} track={track} prize={prize} onClaim={onClaim} onPremium={onPremium} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="octane-reward-track-bar-row">
                                        <button
                                            type="button"
                                            className="octane-reward-track-page-btn"
                                            disabled={currentPage <= 0}
                                            onClick={() => setPage((prevValue) => Math.max(0, prevValue - 1))}
                                            aria-label="previous"
                                        >
                                            {'<'}
                                            {unclaimedBefore > 0 && <span className="octane-reward-track-page-badge">{unclaimedBefore}</span>}
                                        </button>
                                        <div className="octane-reward-track-bar">
                                            <div className="octane-reward-track-bar-progress" style={{ width: `${Math.round(pageProgress * 100)}%` }} />
                                        </div>
                                        <button
                                            type="button"
                                            className="octane-reward-track-page-btn"
                                            disabled={currentPage >= pageCount - 1}
                                            onClick={() => setPage((prevValue) => Math.min(pageCount - 1, prevValue + 1))}
                                            aria-label="next"
                                        >
                                            {'>'}
                                            {unclaimedAfter > 0 && <span className="octane-reward-track-page-badge">{unclaimedAfter}</span>}
                                        </button>
                                    </div>
                                    <div className="octane-reward-track-tier octane-reward-track-tier-premium" data-locked={!track.premium}>
                                        <span className="octane-reward-track-tier-title">
                                            {localizeWithFallback('reward_track.rewards.premium', 'Premium')}
                                            <small>{localizeWithFallback('reward_track.rewards.premium.info', 'Extra rewards for pass holders')}</small>
                                        </span>
                                        <div className="octane-reward-track-tier-prizes">
                                            {(premiumPages[currentPage] ?? []).map((prize) => (
                                                <RewardTrackPrizeView key={prize.id} track={track} prize={prize} onClaim={onClaim} onPremium={onPremium} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="octane-reward-track-body">
                                <div className="octane-reward-track-tasks">
                                    <div className="octane-reward-track-tasks-header">
                                        <span className="font-bold">{localizeWithFallback('reward_track.tasks', 'Tasks')}</span>
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
                                                    <div className={getRewardTrackTaskIconClass(task.actionType)} />
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
                                                    <div className="octane-reward-track-task-reward">{level ? level.pointsReward : 0}</div>
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
                                                <div className={`${getRewardTrackTaskIconClass(selectedTask.actionType)} octane-reward-track-task-icon-large`} />
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
                                                            {ratio >= 1 && <span className="octane-reward-track-level-done" />}
                                                            <span className="octane-reward-track-task-reward">{level.pointsReward}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="octane-reward-track-hint">
                                                <div className="font-bold">{localizeWithFallback('reward_track.levels.tip', 'Tip')}</div>
                                                <Text small>{getRewardTrackTaskText(track.id, selectedTask.id, 'hint.desc', '')}</Text>
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
