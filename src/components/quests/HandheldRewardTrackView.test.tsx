import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { AddLinkEventTracker, CreateLinkEvent } from '@octane/renderer';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHandheldStore } from '../../state/handheldStore';
import { RewardTrackView } from './RewardTrackView';

const mocks = vi.hoisted(() => ({
    claimPrize: vi.fn(),
    purchasePremium: vi.fn(),
    requestTracks: vi.fn(),
    copyTrackId: vi.fn(),
    copyTaskId: vi.fn(),
    securityLevel: 0,
    isEditor: false,
    pendingPurchase: null as string | null,
    tracks: [] as unknown[]
}));

vi.mock('../../hooks', async () => {
    const progressBar = await import('../../hooks/quests/useRewardTrackProgressBar');

    return {
        ...progressBar,
        useHasPermission: () => mocks.isEditor,
        useNotification: () => ({ simpleAlert: null }),
        useUserDataSnapshot: () => ({ securityLevel: mocks.securityLevel }),
        useRewardTracks: () => ({
            tracks: mocks.tracks,
            reloadCount: 0,
            tracksVersion: 1,
            pendingPurchase: mocks.pendingPurchase,
            requestTracks: mocks.requestTracks,
            claimPrize: mocks.claimPrize,
            purchasePremium: mocks.purchasePremium,
            copyTrackId: mocks.copyTrackId,
            copyTaskId: mocks.copyTaskId
        })
    };
});

vi.mock('../../common', () => ({
    Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
    DraggableWindowPosition: { CENTER: 'center', TOP_CENTER: 'top_center' },
    LayoutAvatarImageView: () => <div data-testid="avatar" />,
    LayoutBadgeImageView: ({ badgeCode }: { badgeCode: string }) => <div data-testid={`badge-${badgeCode}`} />,
    LayoutCurrencyIcon: ({ type }: { type: number }) => <i data-currency={type} />,
    LayoutFurniIconImageView: () => <i />,
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>
}));

vi.mock('../../common/Tooltip', () => ({ Hint: ({ children }: { children: ReactNode }) => <>{children}</> }));

// The window itself is DraggableWindow's business (and tested there); here it is a plain box that shows what it was given.
vi.mock('../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: ReactNode; handheldSheet?: boolean }) => (
        <div data-testid="window" data-sheet={String(!!handheldSheet)}>
            {children}
        </div>
    )
}));

vi.mock('../../layout', () => {
    const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
        <div className={className} data-testid="desktop-card">
            {children}
        </div>
    );

    return {
        OctaneCard: Object.assign(Card, {
            Header: ({ headerText }: { headerText: string }) => <h1>{headerText}</h1>,
            Content: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>
        })
    };
});

vi.mock('./RewardTrackAdminView', () => ({
    RewardTrackAdminView: ({ onClose }: { onClose: () => void }) => (
        <button data-testid="admin" onClick={onClose}>
            editor
        </button>
    )
}));

const { localize } = vi.hoisted(() => ({
    localize: (key: string, fallback: string, params: string[] = null, values: string[] = null) => (params ?? []).reduce((text, param, index) => text.replace(`%${param}%`, values[index]), fallback || key)
}));

vi.mock('../../api/utils', () => ({ LocalizeText: (key: string) => key, localizeWithFallback: localize }));
vi.mock('../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));
vi.mock('../../api/octane', () => ({ GetConfigurationValue: (_key: string, fallback: unknown) => fallback }));

vi.mock('../../api', async () => {
    const quests = await import('../../api/quests/QuestUtilities');
    const layout = await import('../../api/quests/RewardTrackLayout');
    const animation = await import('../../api/quests/RewardTrackProgressAnimation');

    return {
        ...quests,
        ...layout,
        ...animation,
        GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
        NotificationAlertType: { DEFAULT: 'default' },
        localizeWithFallback: localize
    };
});

interface TrackLike {
    premium: boolean;
    points: number;
}

const makePrize = (id: string, requiredPoints: number, premium: boolean, claimed = false, rewardAmount = 1) => ({
    id,
    requiredPoints,
    premium,
    claimed,
    rewardTypeId: 'badge',
    extraParams: `B_${id}`,
    rewardAmount,
    productItemTypeId: 0,
    isPremiumLocked(track: TrackLike) {
        return this.premium && !track.premium;
    },
    hasEnoughPoints(track: TrackLike) {
        return track.points >= this.requiredPoints;
    },
    isClaimable(track: TrackLike) {
        return !this.isPremiumLocked(track) && this.hasEnoughPoints(track) && !this.claimed;
    }
});

const makeTask = (id: string, actionType: string, progressCount: number, requirements: number[]) => {
    const levels = requirements.map((requiredCount, index) => ({ requiredCount, pointsReward: 10 * (index + 1), premium: false }));
    const active = levels.findIndex((level) => progressCount < level.requiredCount);
    const activeLevelIndex = active === -1 ? levels.length - 1 : active;

    return {
        id,
        actionType,
        progressCount,
        levels,
        activeLevel: levels[activeLevelIndex],
        activeLevelIndex,
        isComplete: active === -1,
        hasProgress: progressCount > 0,
        progressRatioFor: (level: { requiredCount: number }) => Math.min(1, progressCount / level.requiredCount)
    };
};

type Prize = ReturnType<typeof makePrize>;

const makeTrack = (id: string, points: number, options: { premium?: boolean; hasPremiumConfig?: boolean; prizes?: Prize[] } = {}) => {
    const { premium = false, hasPremiumConfig = true } = options;
    const prizes = options.prizes ?? [
        makePrize('free50', 50, false, true),
        makePrize('prem50', 50, true),
        makePrize('free100', 100, false, false, 5),
        makePrize('free150', 150, false),
        makePrize('free300', 300, false),
        makePrize('prem300', 300, true)
    ];
    const tasks = [makeTask('visit', 'enter_other_users_room', 66, [5, 20, 100]), makeTask('wave', 'wave', 0, [5]), makeTask('dance', 'dance', 3, [3])];
    const track = {
        id,
        theme: 'blue',
        points,
        premium,
        hasPremiumConfig,
        taskPointsBoost: 1.5,
        instantPoints: 0,
        costCredits: 0,
        costDiamonds: 10,
        hasPremiumPrizes: true,
        hasPremiumTasks: false,
        hasPremiumLevels: false,
        prizes,
        tasks,
        claimedPrizeCount: prizes.filter((prize) => prize.claimed).length,
        totalPrizeCount: prizes.length,
        completedTaskCount: tasks.filter((task) => task.isComplete).length,
        totalTaskCount: tasks.length,
        claimablePrizeCount: 0
    };

    track.claimablePrizeCount = prizes.filter((prize) => prize.isClaimable(track)).length;

    return track;
};

const openTrack = (id = 'season') => {
    const tracker = vi.mocked(AddLinkEventTracker).mock.calls.at(-1)[0] as { linkReceived: (url: string) => void };

    act(() => tracker.linkReceived(`reward_track/open/${id}`));
};

const setLayout = (active: boolean, orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.getState().setLayout({ active, orientation }));
const prize = (id: string) => document.querySelector(`[data-prize="${id}"]`) as HTMLElement;
const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(name) });

beforeEach(() => {
    mocks.isEditor = false;
    mocks.securityLevel = 0;
    mocks.pendingPurchase = null;
    mocks.tracks = [makeTrack('season', 160)];
    setLayout(true);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    setLayout(false);
});

describe('HandheldRewardTrackView', () => {
    it('replaces the desktop window on a phone, as a full-screen sheet, and leaves the desktop alone', () => {
        const { container } = render(<RewardTrackView />);

        openTrack();

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(container.querySelector('.octane-handheld-rt')).toBeTruthy();
        expect(screen.queryByTestId('desktop-card')).toBeNull();
        expect(container.querySelector('.octane-reward-track-stage')).toBeNull();

        setLayout(false);

        expect(container.querySelector('.octane-handheld-rt')).toBeNull();
        expect(screen.getByTestId('desktop-card').className).toContain('octane-reward-track');
        expect(container.querySelector('.octane-reward-track-stage')).toBeTruthy();
    });

    it('shows the summary from the track: points, rewards collected and the way to the next reward', () => {
        render(<RewardTrackView />);
        openTrack();

        const summary = within(screen.getByTestId('handheld-rt-summary'));

        expect(mocks.requestTracks).toHaveBeenCalled();
        expect(summary.getByText('season')).toBeTruthy();
        expect(summary.getByText('160')).toBeTruthy();
        expect(summary.getByText('1 / 6 rewards collected')).toBeTruthy();
        expect(summary.getByText('140 points to the next reward')).toBeTruthy();
        // The header carries the points too, and the tab the number of prizes to claim.
        expect(document.querySelector('.octane-handheld-rt__purse').textContent).toBe('160');
        expect(tab('Rewards').textContent).toContain('2');
    });

    it('lays the road out as stops with the free and the premium prize of each side by side, and fills the rail', () => {
        render(<RewardTrackView />);
        openTrack();

        const stops = [...document.querySelectorAll<HTMLElement>('.octane-handheld-rt__stop')];

        expect(stops.map((stop) => stop.querySelector('.octane-handheld-rt__threshold').textContent)).toEqual(['50', '100', '150', '300']);
        expect(stops.map((stop) => stop.dataset.reached)).toEqual(['true', 'true', 'true', 'false']);
        expect(stops.map((stop) => stop.querySelectorAll('.is-free [data-prize]').length)).toEqual([1, 1, 1, 1]);
        expect(stops.map((stop) => stop.querySelectorAll('.is-premium [data-prize]').length)).toEqual([1, 0, 0, 1]);
        // 160 points: the first three rows are full, the last one has a thirtieth of its upper half.
        expect(stops.map((stop) => stop.style.getPropertyValue('--hh-fill'))).toEqual(['1', '1', '0.567', '0']);
        // The eye lands on the first stop with something to claim.
        expect(stops.map((stop) => stop.dataset.current)).toEqual(['false', 'true', 'false', 'false']);

        expect(prize('free50').dataset.state).toBe('claimed');
        expect(prize('prem50').dataset.state).toBe('premium_locked');
        expect(prize('free100').dataset.state).toBe('claimable');
        expect(prize('free100').textContent).toContain('5');
        expect(prize('free300').dataset.state).toBe('not_enough_points');
    });

    it('claims on a tap for claimable prizes only', () => {
        render(<RewardTrackView />);
        openTrack();

        // A claimed prize and one without the points are not buttons at all.
        expect(prize('free50').tagName).toBe('DIV');
        expect(prize('free300').tagName).toBe('DIV');
        fireEvent.click(prize('free50'));
        fireEvent.click(prize('free300'));
        expect(mocks.claimPrize).not.toHaveBeenCalled();

        fireEvent.click(prize('free150'));
        expect(mocks.claimPrize).toHaveBeenCalledWith('season', 'free150');

        // The button at the bottom claims the first prize that waits.
        fireEvent.click(screen.getByTestId('handheld-rt-claim'));
        expect(mocks.claimPrize).toHaveBeenLastCalledWith('season', 'free100');
        expect(mocks.claimPrize).toHaveBeenCalledTimes(2);
    });

    it('has no claim button when nothing waits', () => {
        mocks.tracks = [makeTrack('season', 20)];
        render(<RewardTrackView />);
        openTrack();

        expect(screen.queryByTestId('handheld-rt-claim')).toBeNull();
        expect(screen.getByText('30 points to the next reward')).toBeTruthy();
    });

    it('offers the premium pass from the lane head, a locked premium prize and the tasks strip, and buys it after a confirmation', () => {
        render(<RewardTrackView />);
        openTrack();

        fireEvent.click(prize('prem50'));
        expect(mocks.claimPrize).not.toHaveBeenCalled();

        let confirm = within(screen.getByTestId('handheld-rt-premium'));

        expect(confirm.getByText('50% more points from every task')).toBeTruthy();
        expect(confirm.getByText('Exclusive premium rewards')).toBeTruthy();
        expect(confirm.getByText('10')).toBeTruthy();
        fireEvent.click(confirm.getByText('Cancel'));
        expect(screen.queryByTestId('handheld-rt-premium')).toBeNull();
        expect(mocks.purchasePremium).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTestId('handheld-rt-get-premium'));
        confirm = within(screen.getByTestId('handheld-rt-premium'));
        fireEvent.click(confirm.getByText('Buy'));
        expect(mocks.purchasePremium).toHaveBeenCalledWith('season');
        fireEvent.click(confirm.getByText('Cancel'));

        fireEvent.click(tab('Track Tasks'));
        fireEvent.click(screen.getByText('Get Premium', { selector: '.octane-handheld-rt__tip button' }));
        expect(screen.getByTestId('handheld-rt-premium')).toBeTruthy();
    });

    it('has no way to the pass for its owner, nor on a track without one', () => {
        mocks.tracks = [makeTrack('season', 160, { premium: true })];
        const { unmount } = render(<RewardTrackView />);

        openTrack();
        expect(screen.queryByTestId('handheld-rt-get-premium')).toBeNull();
        expect(prize('prem50').dataset.state).toBe('claimable');
        fireEvent.click(prize('prem50'));
        expect(mocks.claimPrize).toHaveBeenCalledWith('season', 'prem50');
        fireEvent.click(tab('Track Tasks'));
        expect(screen.getByText('Complete tasks to earn points and unlock rewards')).toBeTruthy();
        unmount();

        mocks.tracks = [makeTrack('season', 160, { hasPremiumConfig: false, prizes: [makePrize('free50', 50, false)] })];
        render(<RewardTrackView />);
        openTrack();
        expect(screen.queryByTestId('handheld-rt-get-premium')).toBeNull();
        expect(document.querySelector('.octane-handheld-rt__cell.is-premium')).toBeNull();
        expect(document.querySelector('.octane-handheld-rt__lane.is-premium')).toBeNull();
    });

    it('lists the tasks with their progress and filters them', () => {
        render(<RewardTrackView />);
        openTrack();
        fireEvent.click(tab('Track Tasks'));

        const tasks = () => [...document.querySelectorAll<HTMLElement>('[data-task]')].map((task) => task.dataset.task);

        expect(screen.getByText('1 / 3 completed')).toBeTruthy();
        expect(tasks()).toEqual(['visit', 'wave', 'dance']);
        // The row counts towards the active level, never past its target.
        expect(document.querySelector('[data-task="visit"] .octane-handheld-rt__count').textContent).toBe('66 / 100');
        expect(document.querySelector('[data-task="dance"] .octane-handheld-rt__count').textContent).toBe('3 / 3');

        fireEvent.click(screen.getByRole('button', { name: 'In Progress' }));
        expect(tasks()).toEqual(['visit']);
        expect(screen.getByRole('button', { name: 'In Progress' }).getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
        expect(tasks()).toEqual(['dance']);

        fireEvent.click(screen.getByRole('button', { name: 'All Tasks' }));
        expect(tasks()).toEqual(['visit', 'wave', 'dance']);
    });

    it('opens a task as a page with its levels (counts capped at each target), the tip and its button, and goes back', () => {
        render(<RewardTrackView />);
        openTrack();
        fireEvent.click(tab('Track Tasks'));

        // Upright nothing is open until a task is tapped.
        expect(screen.queryByTestId('handheld-rt-detail')).toBeNull();

        fireEvent.click(document.querySelector('[data-task="visit"]'));

        const detail = screen.getByTestId('handheld-rt-detail');
        const levels = [...detail.querySelectorAll<HTMLElement>('.octane-handheld-rt__level')];

        expect(levels.map((level) => level.querySelector('.octane-handheld-rt__count').textContent)).toEqual(['5 / 5', '20 / 20', '66 / 100']);
        expect(levels.map((level) => !!level.querySelector('.octane-handheld-rt__level-check img'))).toEqual([true, true, false]);
        expect(levels.map((level) => level.dataset.active)).toEqual(['false', 'false', 'true']);
        expect(levels.map((level) => level.querySelector('.octane-handheld-rt__points').textContent)).toEqual(['10', '20', '30']);

        fireEvent.click(screen.getByTestId('handheld-rt-hint-action'));
        expect(CreateLinkEvent).toHaveBeenCalledWith('navigator/show');

        fireEvent.click(within(detail).getByText('Back'));
        expect(screen.queryByTestId('handheld-rt-detail')).toBeNull();
        expect(document.querySelectorAll('[data-task]').length).toBe(3);
    });

    it('shows the details beside the list on its side, of the first task until another is chosen', () => {
        setLayout(true, 'landscape');
        render(<RewardTrackView />);
        openTrack();
        fireEvent.click(tab('Track Tasks'));

        expect(within(screen.getByTestId('handheld-rt-detail')).getByText('visit')).toBeTruthy();
        expect(document.querySelector('[data-task="visit"]').getAttribute('data-selected')).toBe('true');

        fireEvent.click(document.querySelector('[data-task="wave"]'));
        expect(within(screen.getByTestId('handheld-rt-detail')).getByText('wave')).toBeTruthy();
    });

    it('switches between the active tracks from the chips', () => {
        mocks.tracks = [makeTrack('season', 160), makeTrack('introduction', 20)];
        render(<RewardTrackView />);
        openTrack();

        const chips = [...document.querySelectorAll<HTMLElement>('[data-track]')];

        expect(chips.map((chip) => chip.dataset.track)).toEqual(['season', 'introduction']);
        expect(chips.map((chip) => chip.dataset.active)).toEqual(['true', 'false']);
        // The other track's chip tells how many of its prizes wait.
        expect(chips[0].textContent).toContain('2');

        mocks.requestTracks.mockClear();
        fireEvent.click(chips[1]);

        expect(mocks.requestTracks).toHaveBeenCalled();
        expect(within(screen.getByTestId('handheld-rt-summary')).getByText('introduction')).toBeTruthy();
        expect(document.querySelector('[data-track="introduction"]').getAttribute('data-active')).toBe('true');
    });

    it('has no chips for a single track', () => {
        render(<RewardTrackView />);
        openTrack();

        expect(document.querySelector('[data-track]')).toBeNull();
    });

    it('keeps the staff tools: the gear opens the editor in the sheet, names copy their ids', () => {
        mocks.isEditor = true;
        mocks.securityLevel = 5;
        render(<RewardTrackView />);
        openTrack();

        fireEvent.click(within(screen.getByTestId('handheld-rt-summary')).getByRole('button', { name: 'season' }));
        expect(mocks.copyTrackId).toHaveBeenCalledWith('season');

        fireEvent.click(tab('Track Tasks'));
        fireEvent.click(document.querySelector('[data-task="wave"]'));
        fireEvent.click(within(screen.getByTestId('handheld-rt-detail')).getByRole('button', { name: 'wave' }));
        expect(mocks.copyTaskId).toHaveBeenCalledWith('wave');

        fireEvent.click(screen.getByTestId('reward-track-admin-toggle'));
        expect(screen.getByTestId('admin').closest('.octane-handheld-rt__admin')).toBeTruthy();
        expect(screen.queryByTestId('handheld-rt-summary')).toBeNull();
        expect(screen.queryByRole('tab')).toBeNull();

        fireEvent.click(screen.getByTestId('admin'));
        expect(screen.getByTestId('handheld-rt-summary')).toBeTruthy();
    });

    it('hides the staff tools from everybody else and closes from the header', () => {
        render(<RewardTrackView />);
        openTrack();

        expect(screen.queryByTestId('reward-track-admin-toggle')).toBeNull();
        expect(within(screen.getByTestId('handheld-rt-summary')).queryByRole('button', { name: 'season' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'generic.close' }));
        expect(document.querySelector('.octane-handheld-rt')).toBeNull();
    });
});
