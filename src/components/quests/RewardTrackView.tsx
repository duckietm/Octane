import {
    AddLinkEventTracker,
    CreateLinkEvent,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RewardTrackData,
    RewardTrackPrizeData,
    RewardTrackTaskData,
    SecurityLevel
} from '@octane/renderer';
import { CSSProperties, FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FaCog } from 'react-icons/fa';
import {
    buildRewardTrackLayout,
    buildRewardTrackPages,
    countRewardTrackUnclaimed,
    filterRewardTrackTasks,
    GetConfigurationValue,
    getPremiumBoostPercent,
    getRewardTrackMainBarFillWidth,
    getRewardTrackMainBarRatio,
    getRewardTrackPrizeState,
    getRewardTrackPrizeTooltip,
    getRewardTrackSlotLeft,
    getRewardTrackTaskHintLink,
    getRewardTrackTaskText,
    getRewardTrackText,
    localizeWithFallback,
    NotificationAlertType,
    REWARD_TRACK_BAR_WIDTH,
    RewardTrackTaskFilter,
    resolveRewardTrackTheme,
    rewardTrackColorToCss
} from '../../api';
import availableIcon from '../../assets/images/reward-track/available-icon.png';
import checkmarkIcon from '../../assets/images/reward-track/checkmark.png';
import frankAndPiccoloImage from '../../assets/images/reward-track/frank-and-piccolo.png';
import frankTipsImage from '../../assets/images/reward-track/frank-tips.png';
import freeTrackIcon from '../../assets/images/reward-track/free-track.png';
import lockedRewardIcon from '../../assets/images/reward-track/locked-reward.png';
import notAvailableIcon from '../../assets/images/reward-track/not-available-icon.png';
import pageNextIcon from '../../assets/images/reward-track/page-next.png';
import pagePreviousIcon from '../../assets/images/reward-track/page-previous.png';
import pointLargeIcon from '../../assets/images/reward-track/point-large.png';
import pointSmallIcon from '../../assets/images/reward-track/point-small.png';
import premiumTrackIcon from '../../assets/images/reward-track/premium-track.png';
import prizesBackgroundImage from '../../assets/images/reward-track/prizes-background.png';
import prizesStarsImage from '../../assets/images/reward-track/prizes-background-stars.png';
import rewardGiftIcon from '../../assets/images/reward-track/reward-gift.png';
import rewardGiftPremiumIcon from '../../assets/images/reward-track/reward-gift-premium.png';
import taskListIcon from '../../assets/images/reward-track/task-list.png';
import { GetRewardTrackTaskIconUrl } from '../../assets/images/reward-track/tasks';
import { Button, DraggableWindowPosition, LayoutAvatarImageView, LayoutBadgeImageView, LayoutCurrencyIcon, LayoutFurniIconImageView, Text } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { Hint } from '../../common/Tooltip';
import { useHasPermission, useNotification, useRewardTrackProgressBar, useRewardTracks, useUserDataSnapshot } from '../../hooks';
import { OctaneCard } from '../../layout';
import { RewardTrackAdminView } from './RewardTrackAdminView';

const CURRENCY_TYPES: Record<string, number> = { credits: -1, duckets: 0, diamonds: 5 };
const FILTERS: RewardTrackTaskFilter[] = ['all', 'in_progress', 'completed'];
const FILTER_KEYS: Record<RewardTrackTaskFilter, [string, string]> = {
    all: ['reward_track.tasks.tab.all_tasks', 'All Tasks'],
    in_progress: ['reward_track.tasks.tab.in_progress', 'In Progress'],
    completed: ['reward_track.tasks.tab.completed', 'Completed']
};
/** loading_bar widths of task_template (200) and level_template (260). */
const TASK_BAR_WIDTH = 200;
const LEVEL_BAR_WIDTH = 260;

/** The product_icon widget (40x40) of a prize. */
const RewardIcon: FC<{ rewardTypeId: string; extraParams: string; productItemTypeId: number }> = ({ rewardTypeId, extraParams, productItemTypeId }) => {
    const type = (rewardTypeId || '').toLowerCase();

    if (type in CURRENCY_TYPES) return <LayoutCurrencyIcon type={CURRENCY_TYPES[type]} className="octane-reward-track-prize-currency" />;

    if (type === 'badge') return <LayoutBadgeImageView badgeCode={extraParams} />;

    // A furni prize: the server sends its sprite id and "<s|i>:<name>" (floor or wall, then the items_base name).
    if (type === 'furni') return <LayoutFurniIconImageView productType={extraParams.startsWith('i:') ? 'i' : 's'} productClassId={productItemTypeId} className="octane-reward-track-prize-furni" />;

    return <div className="octane-reward-track-prize-generic">{rewardTypeId}</div>;
};

/** The task picture (reward_track_tasks_<action>) centred in its slot, as static_bitmap pivot_point="center". */
const RewardTrackTaskGlyph: FC<{ actionType: string; large?: boolean }> = ({ actionType, large = false }) => {
    const url = GetRewardTrackTaskIconUrl(actionType);

    return (
        <div className={large ? 'octane-reward-track-detail-glyph' : 'octane-reward-track-task-glyph'}>
            {url && <img src={url} alt="" draggable={false} />}
        </div>
    );
};

/**
 * A loading_bar of the task rows and levels (RewardTrackTaskProgressBarView): grey track, orange fill that
 * turns green over 300 ms once full, with its gloss. The fill moves with AIR's accelerated mover.
 */
const RewardTrackMiniBar: FC<{ ratio: number; width: number; snapKey: string; levelIndex?: number }> = ({ ratio, width, snapKey, levelIndex = -1 }) => {
    const bar = useRewardTrackProgressBar({ ratio, maxWidth: width, animate: true, snapKey, task: true, levelIndex });

    return (
        <div className="octane-reward-track-mini-bar" style={{ width }} data-complete={ratio >= 1}>
            <div className="octane-reward-track-mini-bar-progress" style={{ width: bar.width }}>
                <div className="octane-reward-track-mini-bar-fill" style={{ backgroundColor: rewardTrackColorToCss(bar.color) }} />
                <div className="octane-reward-track-mini-bar-gloss" />
            </div>
        </div>
    );
};

/**
 * The track's main loading_bar (RewardTrackMainProgressBarView): the `progress` container moves to the x of
 * the points with AIR's accelerated mover; the green shape is 4px longer (the whole bar near the end).
 */
const RewardTrackMainBar: FC<{ x: number; snapKey: string }> = ({ x, snapKey }) => {
    const bar = useRewardTrackProgressBar({
        ratio: getRewardTrackMainBarRatio(x, REWARD_TRACK_BAR_WIDTH),
        maxWidth: REWARD_TRACK_BAR_WIDTH,
        animate: true,
        snapKey
    });

    return (
        <div className="octane-reward-track-bar" data-testid="reward-track-bar">
            <div className="octane-reward-track-bar-progress" style={{ width: bar.width }}>
                <div className="octane-reward-track-bar-fill" style={{ width: getRewardTrackMainBarFillWidth(bar.width, REWARD_TRACK_BAR_WIDTH) }} />
                <div className="octane-reward-track-bar-gloss" />
            </div>
        </div>
    );
};

/** The points value with the small points icon (track_reward_txt / level_reward_txt). */
const RewardTrackPointsReward: FC<{ value: number }> = ({ value }) => (
    <span className="octane-reward-track-points-reward">
        <span>{value}</span>
        <img src={pointSmallIcon} alt="" draggable={false} />
    </span>
);

/**
 * One prize (prize_template 80x105 / prize_template_premium 80x104): the click region with its shadow and
 * plate, the product icon (3px higher when the quantity chip shows), the stem towards the bar, the lock and
 * the claimed check. A prize without enough points is dimmed to 0.75 and loses its shadow.
 */
const RewardTrackPrizeView: FC<{
    left: number;
    track: RewardTrackData;
    prize: RewardTrackPrizeData;
    onClaim: (prize: RewardTrackPrizeData) => void;
    onPremium: () => void;
}> = ({ left, track, prize, onClaim, onPremium }) => {
    const state = getRewardTrackPrizeState(prize, track);
    const enoughPoints = prize.hasEnoughPoints(track);

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
            className="octane-reward-track-prize"
            data-state={state}
            data-premium={prize.premium}
            data-disabled={!enoughPoints}
            style={{ left }}
        >
            <Hint content={getRewardTrackPrizeTooltip(state)} delay={0}>
                <BaseButton className="octane-reward-track-prize-hit" onClick={onClick} aria-label={getRewardTrackPrizeTooltip(state)}>
                    <span className="octane-reward-track-prize-shadow" />
                    <span className="octane-reward-track-prize-plate">
                        <span className="octane-reward-track-prize-product" data-shifted={prize.rewardAmount > 1}>
                            <RewardIcon rewardTypeId={prize.rewardTypeId} extraParams={prize.extraParams} productItemTypeId={prize.productItemTypeId} />
                        </span>
                        {prize.rewardAmount > 1 && <span className="octane-reward-track-prize-quantity">{prize.rewardAmount}</span>}
                    </span>
                </BaseButton>
            </Hint>
            <span className="octane-reward-track-prize-stem" />
            {state === 'premium_locked' && <img src={lockedRewardIcon} alt="" draggable={false} className="octane-reward-track-prize-lock" />}
            {state === 'claimed' && <img src={checkmarkIcon} alt="" draggable={false} className="octane-reward-track-prize-check" />}
        </div>
    );
};

/** One point_indicator_template (80x157): reached icon on the bar, connector, dot, stem and the points label. */
const RewardTrackPointIndicatorView: FC<{ left: number; points: number; reached: boolean }> = ({ left, points, reached }) => (
    <div className="octane-reward-track-indicator" data-reached={reached} style={{ left }}>
        <img src={reached ? availableIcon : notAvailableIcon} alt="" draggable={false} className="octane-reward-track-indicator-icon" />
        <span className="octane-reward-track-indicator-connector" />
        <span className="octane-reward-track-indicator-dot" />
        <span className="octane-reward-track-indicator-stem" />
        <span className="octane-reward-track-indicator-points">{points}</span>
    </div>
);

/** A free / premium band (free_tier_cont / premium_tier_cont 700x80) with its information cut-out. */
const RewardTrackBandView: FC<{ premium: boolean }> = ({ premium }) => (
    <div className={`octane-reward-track-band octane-reward-track-band-${premium ? 'premium' : 'free'}`}>
        <div className="octane-reward-track-band-info">
            <span className="octane-reward-track-band-cut" />
            <span className="octane-reward-track-band-split" />
            <img
                src={premium ? premiumTrackIcon : freeTrackIcon}
                alt=""
                draggable={false}
                className="octane-reward-track-band-icon"
            />
            <div className="octane-reward-track-band-texts">
                <span className="octane-reward-track-band-title">
                    {premium ? localizeWithFallback('reward_track.rewards.premium', 'Premium') : localizeWithFallback('reward_track.rewards.free', 'Free Track')}
                </span>
                {premium && <span className="octane-reward-track-band-desc">{localizeWithFallback('reward_track.rewards.premium.info', 'Extra rewards')}</span>}
            </div>
        </div>
    </div>
);

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
 * The official reward track window (reward_track_main_xml 1103x722, `reward_track/open/<id>`), laid out
 * at the layout's pixel positions: the header stage (the rewards panel with its background, the main bar,
 * the free and premium bands, the point indicators and the prizes placed along the track by their points,
 * the page buttons, and the profile cut-out over its left edge) and the body (the task list with its
 * filters and tip, the task details with the levels and the hint).
 */
export const RewardTrackView: FC<{}> = () => {
    const [trackId, setTrackId] = useState<string>(null);
    const [filter, setFilter] = useState<RewardTrackTaskFilter>('all');
    const [selectedTaskId, setSelectedTaskId] = useState<string>(null);
    // null: the page of the track's points (RewardTrackPrizeTrackView opens on it); a number once paged.
    const [page, setPage] = useState<number>(null);
    const [premiumConfirm, setPremiumConfirm] = useState(false);
    // The gear opens the staff editor inside the same window (acc_rewardtrack).
    const isEditor = useHasPermission('acc_rewardtrack');
    const [editMode, setEditMode] = useState(false);
    const {
        tracks = [],
        reloadCount = 0,
        tracksVersion = 0,
        pendingPurchase = null,
        requestTracks = null,
        claimPrize = null,
        purchasePremium = null,
        copyTrackId = null,
        copyTaskId = null
    } = useRewardTracks();
    // RewardTrackController._ra5fbf8bddad7bd: EMPLOYEE or MODERATOR security (level 4+) may copy the ids.
    const canCopyIds = useUserDataSnapshot().securityLevel >= SecurityLevel.EMPLOYEE;
    const { simpleAlert = null } = useNotification();

    const track = useMemo(() => tracks.find((existing) => existing.id === trackId) ?? null, [tracks, trackId]);

    const open = useCallback(
        (id: string) => {
            setTrackId(id);
            setEditMode(false);
            setFilter('all');
            setSelectedTaskId(null);
            setPage(null);
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
    const prizes = track?.prizes ?? [];
    const layout = useMemo(() => buildRewardTrackLayout(prizes), [prizes]);
    const pages = useMemo(() => buildRewardTrackPages(prizes, layout), [prizes, layout]);
    const points = track?.points ?? 0;
    const currentPage = Math.max(0, Math.min(layout.pageCount - 1, page ?? layout.pageOf(points)));
    // RewardTrackPrizeTrackView picks the page of the points once, when the view is built; progress
    // afterwards moves the bar on that page instead of turning the page.
    const pinnedPage = track ? currentPage : null;

    useEffect(() => {
        if (page === null && pinnedPage !== null) setPage(pinnedPage);
    }, [page, pinnedPage]);
    const pageData = pages[currentPage] ?? { free: [], premium: [], points: [] };
    const unclaimed = track ? countRewardTrackUnclaimed(prizes, layout, currentPage, (prize) => prize.isClaimable(track)) : { next: 0, previous: 0 };

    const themeStyle = {
        '--rt-dark': theme.dark,
        '--rt-medium': theme.medium,
        '--rt-light': theme.light,
        '--rt-active': theme.active,
        '--rt-prizes-background': `url("${prizesBackgroundImage}")`
    } as CSSProperties;

    const filteredTasks = useMemo(() => filterRewardTrackTasks(track?.tasks ?? [], filter), [track, filter]);
    // RewardTrackTaskListView.applyFilter(): the selection falls back to the first task the filter keeps.
    const selectedTask: RewardTrackTaskData = useMemo(
        () => filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null,
        [selectedTaskId, filteredTasks]
    );

    if (!trackId) return null;

    const onClaim = (prize: RewardTrackPrizeData) => track && claimPrize && claimPrize(track.id, prize.id);
    const onPremium = () => track && track.hasPremiumConfig && !track.premium && setPremiumConfirm(true);

    const hintLink = track && selectedTask
        ? getRewardTrackTaskHintLink(
              selectedTask.actionType,
              GetConfigurationValue<string>(`reward_track.${track.id}.task.${selectedTask.id}.hint.internal_link`, '')
          )
        : null;

    return (
        <>
            <OctaneCard className="octane-reward-track" uniqueKey="reward-track" windowPosition={DraggableWindowPosition.TOP_CENTER} style={themeStyle}>
                <OctaneCard.Header headerText={localizeWithFallback('reward_track.title', 'Reward Track')} onCloseClick={() => setTrackId(null)} />
                <OctaneCard.Content className="octane-reward-track-content">
                    {isEditor && !editMode && track && (
                        <Hint content={localizeWithFallback('reward_track.admin.open', 'Edit the reward tracks')}>
                            <BaseButton
                                aria-label={localizeWithFallback('reward_track.admin.open', 'Edit the reward tracks')}
                                type="button"
                                className="octane-reward-track-admin-toggle"
                                data-testid="reward-track-admin-toggle"
                                onClick={() => setEditMode(true)}
                            >
                                <FaCog />
                            </BaseButton>
                        </Hint>
                    )}
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
                        <div className="octane-reward-track-stage">
                            <div className="octane-reward-track-header">
                                <div className="octane-reward-track-rewards">
                                    <span className="octane-reward-track-rewards-background" />
                                    <span className="octane-reward-track-rewards-sky" />
                                    <img src={prizesStarsImage} alt="" draggable={false} className="octane-reward-track-rewards-stars" />
                                    <RewardTrackBandView premium={false} />
                                    <RewardTrackBandView premium />
                                    <RewardTrackMainBar x={layout.xFor(points, currentPage)} snapKey={`${tracksVersion}:${track.id}:${currentPage}`} />
                                    <div className="octane-reward-track-points-band" />
                                    <div className="octane-reward-track-indicators">
                                        {pageData.points.map((value) => (
                                            <RewardTrackPointIndicatorView
                                                key={value}
                                                left={getRewardTrackSlotLeft(layout.xFor(value, currentPage))}
                                                points={value}
                                                reached={points >= value}
                                            />
                                        ))}
                                    </div>
                                    <div className="octane-reward-track-prizes">
                                        {[...pageData.free, ...pageData.premium].map((prize) => (
                                            <RewardTrackPrizeView
                                                key={prize.id}
                                                left={getRewardTrackSlotLeft(layout.xFor(prize.requiredPoints, currentPage))}
                                                track={track}
                                                prize={prize}
                                                onClaim={onClaim}
                                                onPremium={onPremium}
                                            />
                                        ))}
                                    </div>
                                    <BaseButton
                                        type="button"
                                        className="octane-reward-track-page"
                                        data-side="previous"
                                        disabled={currentPage <= 0}
                                        onClick={() => setPage(Math.max(0, currentPage - 1))}
                                        aria-label={localizeWithFallback('reward_track.rewards.previous', 'Previous rewards')}
                                    >
                                        <img src={pagePreviousIcon} alt="" draggable={false} />
                                    </BaseButton>
                                    <BaseButton
                                        type="button"
                                        className="octane-reward-track-page"
                                        data-side="next"
                                        disabled={currentPage >= layout.pageCount - 1}
                                        onClick={() => setPage(Math.min(layout.pageCount - 1, currentPage + 1))}
                                        aria-label={localizeWithFallback('reward_track.rewards.next', 'Next rewards')}
                                    >
                                        <img src={pageNextIcon} alt="" draggable={false} />
                                    </BaseButton>
                                    {unclaimed.previous > 0 && (
                                        <span className="octane-reward-track-unclaimed" data-side="previous">
                                            {unclaimed.previous}
                                        </span>
                                    )}
                                    {unclaimed.next > 0 && (
                                        <span className="octane-reward-track-unclaimed" data-side="next">
                                            {unclaimed.next}
                                        </span>
                                    )}
                                </div>
                                <div className="octane-reward-track-cutout">
                                    <span className="octane-reward-track-bulge" />
                                    <div className="octane-reward-track-profile">
                                        <LayoutAvatarImageView figure={GetSessionDataManager().figure} direction={2} className="octane-reward-track-avatar" />
                                        <div className="octane-reward-track-info">
                                            {canCopyIds ? (
                                                <BaseButton
                                                    type="button"
                                                    className="octane-reward-track-title octane-reward-track-copy-region"
                                                    onClick={() => copyTrackId && copyTrackId(track.id)}
                                                >
                                                    {getRewardTrackText(track.id, 'name', track.id)}
                                                </BaseButton>
                                            ) : (
                                                <div className="octane-reward-track-title">{getRewardTrackText(track.id, 'name', track.id)}</div>
                                            )}
                                            <div className="octane-reward-track-desc">{getRewardTrackText(track.id, 'desc', '')}</div>
                                            <div className="octane-reward-track-instructions">{getRewardTrackText(track.id, 'info', '')}</div>
                                        </div>
                                        <div className="octane-reward-track-points">
                                            <span className="octane-reward-track-points-value">
                                                <img src={pointLargeIcon} alt="" draggable={false} />
                                                <span>{track.points}</span>
                                            </span>
                                            <span className="octane-reward-track-points-label">
                                                {localizeWithFallback('reward_track.profile.points_collected', 'Points collected')}
                                            </span>
                                        </div>
                                        <span className="octane-reward-track-splitter" />
                                        <div className="octane-reward-track-collected">
                                            <img src={checkmarkIcon} alt="" draggable={false} />
                                            <span>
                                                {localizeWithFallback(
                                                    'reward_track.profile.rewards_collected',
                                                    '%progress% / %total% rewards collected',
                                                    ['progress', 'total'],
                                                    [String(track.claimedPrizeCount), String(track.totalPrizeCount)]
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="octane-reward-track-body">
                                <div className="octane-reward-track-tasks">
                                    <img src={taskListIcon} alt="" draggable={false} className="octane-reward-track-tasks-icon" />
                                    <span className="octane-reward-track-tasks-title">{localizeWithFallback('reward_track.tasks', 'Track Tasks')}</span>
                                    <span className="octane-reward-track-tasks-progress">
                                        {localizeWithFallback(
                                            'reward_track.tasks.progress',
                                            '%progress% / %total% completed',
                                            ['progress', 'total'],
                                            [String(track.completedTaskCount), String(track.totalTaskCount)]
                                        )}
                                    </span>
                                    <div className="octane-reward-track-filters">
                                        {FILTERS.map((value) => (
                                            <BaseButton
                                                key={value}
                                                type="button"
                                                className="octane-reward-track-filter"
                                                data-active={filter === value}
                                                onClick={() => setFilter(value)}
                                            >
                                                {localizeWithFallback(FILTER_KEYS[value][0], FILTER_KEYS[value][1])}
                                            </BaseButton>
                                        ))}
                                    </div>
                                    <div className="octane-reward-track-task-list">
                                        {filteredTasks.map((task) => {
                                            const level = task.activeLevel;

                                            return (
                                                <BaseButton
                                                    key={task.id}
                                                    className="octane-reward-track-task"
                                                    data-selected={selectedTask?.id === task.id}
                                                    data-complete={task.isComplete}
                                                    onClick={() => setSelectedTaskId(task.id)}
                                                >
                                                    <RewardTrackTaskGlyph actionType={task.actionType} />
                                                    <span className="octane-reward-track-task-name">{getRewardTrackTaskText(track.id, task.id, 'name', task.id)}</span>
                                                    <span className="octane-reward-track-task-desc">{getRewardTrackTaskText(track.id, task.id, 'desc', '')}</span>
                                                    <span className="octane-reward-track-task-bar">
                                                        <RewardTrackMiniBar
                                                            ratio={task.progressRatioFor(level)}
                                                            width={TASK_BAR_WIDTH}
                                                            snapKey={`${tracksVersion}:${track.id}`}
                                                            levelIndex={task.activeLevelIndex}
                                                        />
                                                    </span>
                                                    <span className="octane-reward-track-task-count">
                                                        {task.progressCount} / {level ? level.requiredCount : 0}
                                                    </span>
                                                    <span className="octane-reward-track-task-reward">
                                                        <RewardTrackPointsReward value={level ? level.pointsReward : 0} />
                                                    </span>
                                                </BaseButton>
                                            );
                                        })}
                                    </div>
                                    {(!track.hasPremiumConfig || track.premium) && (
                                        <div className="octane-reward-track-tip">
                                            <img src={rewardGiftIcon} alt="" draggable={false} className="octane-reward-track-tip-gift" />
                                            <span className="octane-reward-track-tip-text">
                                                {localizeWithFallback('reward_track.tasks.tip', 'Complete tasks to earn points and unlock rewards')}
                                            </span>
                                            <img src={frankAndPiccoloImage} alt="" draggable={false} className="octane-reward-track-tip-frank" />
                                        </div>
                                    )}
                                    {track.hasPremiumConfig && !track.premium && (
                                        <div className="octane-reward-track-tip octane-reward-track-tip-premium">
                                            <img src={rewardGiftPremiumIcon} alt="" draggable={false} className="octane-reward-track-tip-gift" />
                                            <span className="octane-reward-track-tip-text">
                                                {localizeWithFallback('reward_track.tasks.tip_upgrade', 'Upgrade now for premium rewards and faster progress!')}
                                            </span>
                                            <BaseButton type="button" className="octane-reward-track-button octane-reward-track-get-premium" onClick={onPremium}>
                                                {localizeWithFallback('reward_track.tasks.tip_upgrade.button', 'Get Premium')}
                                            </BaseButton>
                                        </div>
                                    )}
                                </div>
                                <div className="octane-reward-track-task-info">
                                    {selectedTask && (
                                        <>
                                            <RewardTrackTaskGlyph actionType={selectedTask.actionType} large />
                                            {canCopyIds ? (
                                                <BaseButton
                                                    type="button"
                                                    className="octane-reward-track-task-info-name octane-reward-track-copy-region"
                                                    onClick={() => copyTaskId && copyTaskId(selectedTask.id)}
                                                >
                                                    {getRewardTrackTaskText(track.id, selectedTask.id, 'name', selectedTask.id)}
                                                </BaseButton>
                                            ) : (
                                                <div className="octane-reward-track-task-info-name">
                                                    {getRewardTrackTaskText(track.id, selectedTask.id, 'name', selectedTask.id)}
                                                </div>
                                            )}
                                            <div className="octane-reward-track-task-info-desc">{getRewardTrackTaskText(track.id, selectedTask.id, 'desc', '')}</div>
                                            <span className="octane-reward-track-levels-rule" />
                                            <span className="octane-reward-track-levels-title">{localizeWithFallback('reward_track.levels.title', 'Levels')}</span>
                                            <div className="octane-reward-track-levels">
                                                {selectedTask.levels.map((level, index) => {
                                                    const ratio = selectedTask.progressRatioFor(level);

                                                    return (
                                                        <div key={index} className="octane-reward-track-level" data-active={index === selectedTask.activeLevelIndex}>
                                                            <span className="octane-reward-track-level-name">
                                                                {localizeWithFallback('reward_track.levels.level', 'Level %level%', ['level'], [String(index + 1)])}
                                                            </span>
                                                            <span className="octane-reward-track-level-bar">
                                                                <RewardTrackMiniBar
                                                                    ratio={ratio}
                                                                    width={LEVEL_BAR_WIDTH}
                                                                    snapKey={`${tracksVersion}:${track.id}:${selectedTask.id}`}
                                                                />
                                                            </span>
                                                            <span className="octane-reward-track-level-count">
                                                                {selectedTask.progressCount} / {level.requiredCount}
                                                            </span>
                                                            <span className="octane-reward-track-level-end">
                                                                {ratio >= 1 && <img src={checkmarkIcon} alt="" draggable={false} className="octane-reward-track-level-check" />}
                                                                <RewardTrackPointsReward value={level.pointsReward} />
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="octane-reward-track-hint">
                                                <span className="octane-reward-track-hint-frank">
                                                    <img src={frankTipsImage} alt="" draggable={false} />
                                                </span>
                                                <span className="octane-reward-track-hint-title">{localizeWithFallback('reward_track.levels.tip', 'Tip!')}</span>
                                                <span className="octane-reward-track-hint-text">{getRewardTrackTaskText(track.id, selectedTask.id, 'hint.desc', '')}</span>
                                                {hintLink && (
                                                    <BaseButton
                                                        type="button"
                                                        className="octane-reward-track-button octane-reward-track-hint-button"
                                                        onClick={() => CreateLinkEvent(hintLink.link)}
                                                    >
                                                        {getRewardTrackTaskText(track.id, selectedTask.id, 'hint.button_text', hintLink.fallbackText)}
                                                    </BaseButton>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
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
