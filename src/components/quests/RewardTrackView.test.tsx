import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AddLinkEventTracker, CreateLinkEvent } from '@octane/renderer';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RewardTrackView } from './RewardTrackView';

const mocks = vi.hoisted(() => ({
    claimPrize: vi.fn(),
    purchasePremium: vi.fn(),
    requestTracks: vi.fn(),
    copyTrackId: vi.fn(),
    copyTaskId: vi.fn(),
    securityLevel: 0,
    tracksVersion: 1,
    isEditor: false,
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
            tracksVersion: mocks.tracksVersion,
            pendingPurchase: null,
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
    LayoutCurrencyIcon: () => <i />,
    LayoutFurniIconImageView: () => <i />,
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>
}));

vi.mock('../../common/Tooltip', () => ({
    Hint: ({ children, content }: { children: ReactNode; content: string }) => (
        <span data-hint={content} className="hint">
            {children}
        </span>
    )
}));

vi.mock('../../layout', () => {
    const Card = ({ children, className, style }: { children: ReactNode; className?: string; style?: object }) => (
        <div className={className} style={style}>
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

vi.mock('./RewardTrackAdminView', () => ({ RewardTrackAdminView: () => <div data-testid="admin" /> }));

const { localize } = vi.hoisted(() => ({
    localize: (key: string, fallback: string, params: string[] = [], values: string[] = []) =>
        params.reduce((text, param, index) => text.replace(`%${param}%`, values[index]), fallback || key)
}));

vi.mock('../../api/utils', () => ({ LocalizeText: (key: string) => key, localizeWithFallback: localize }));
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

const makePrize = (id: string, requiredPoints: number, premium: boolean, claimed = false) => ({
    id,
    requiredPoints,
    premium,
    claimed,
    rewardTypeId: 'badge',
    extraParams: `B_${id}`,
    rewardAmount: 1,
    productItemTypeId: 0,
    isPremiumLocked(track: { premium: boolean }) {
        return this.premium && !track.premium;
    },
    hasEnoughPoints(track: { points: number }) {
        return track.points >= this.requiredPoints;
    },
    isClaimable(track: { premium: boolean; points: number }) {
        return !this.isPremiumLocked(track) && this.hasEnoughPoints(track) && !this.claimed;
    }
});

const makeTask = (id: string, actionType: string, progressCount: number, required: number) => {
    const levels = [{ requiredCount: required, pointsReward: 30, premium: false }];

    return {
        id,
        actionType,
        progressCount,
        levels,
        activeLevel: levels[0],
        activeLevelIndex: 0,
        isComplete: progressCount >= required,
        hasProgress: progressCount > 0,
        progressRatioFor: (level: { requiredCount: number }) => Math.min(1, progressCount / level.requiredCount)
    };
};

const makeTrack = (points: number, premium = false, prizes = [makePrize('free50', 50, false), makePrize('prem200', 200, true)]) => ({
    id: 'introduction',
    theme: 'blue',
    points,
    premium,
    hasPremiumConfig: true,
    taskPointsBoost: 1,
    instantPoints: 0,
    costCredits: 0,
    costDiamonds: 10,
    hasPremiumPrizes: true,
    hasPremiumTasks: false,
    hasPremiumLevels: false,
    prizes,
    tasks: [makeTask('visit_rooms', 'enter_other_users_room', 1, 1), makeTask('wave_at_user', 'wave', 0, 5)],
    claimedPrizeCount: prizes.filter((prize) => prize.claimed).length,
    totalPrizeCount: prizes.length,
    completedTaskCount: 1,
    totalTaskCount: 2
});

const openTrack = () => {
    const tracker = vi.mocked(AddLinkEventTracker).mock.calls.at(-1)[0] as { linkReceived: (url: string) => void };

    act(() => tracker.linkReceived('reward_track/open/introduction'));
};

const prizeElement = (badge: string) => screen.getByTestId(`badge-${badge}`).closest('.octane-reward-track-prize') as HTMLElement;

beforeEach(() => {
    mocks.isEditor = false;
    mocks.securityLevel = 0;
    mocks.tracksVersion = 1;
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('RewardTrackView', () => {
    it('positions the prizes and indicators along the track and sizes the bar from the points', () => {
        mocks.tracks = [makeTrack(60)];
        const { container } = render(<RewardTrackView />);

        openTrack();

        expect(mocks.requestTracks).toHaveBeenCalled();
        expect(prizeElement('B_free50').style.left).toBe('15px');
        expect(prizeElement('B_prem200').style.left).toBe('92px');

        const indicators = container.querySelectorAll('.octane-reward-track-indicator');

        expect([...indicators].map((node) => (node as HTMLElement).style.left)).toEqual(['15px', '92px']);
        expect([...indicators].map((node) => node.getAttribute('data-reached'))).toEqual(['true', 'false']);
        expect([...indicators].map((node) => node.textContent)).toEqual(['50', '200']);

        // x(60) = 55 + 10 * 0.5137 = 60.1 -> 60px of progress, the fill 4px more.
        const progress = container.querySelector('.octane-reward-track-bar-progress') as HTMLElement;

        expect(progress.style.width).toBe('60px');
        expect((container.querySelector('.octane-reward-track-bar-fill') as HTMLElement).style.width).toBe('64px');
        expect(screen.getByText('0 / 2 rewards collected')).toBeTruthy();
        expect(screen.getByText('60')).toBeTruthy();
    });

    it('shows the prize states: claimable, premium locked (lock, upgrade tooltip) and dimmed without points', () => {
        mocks.tracks = [makeTrack(60)];
        render(<RewardTrackView />);
        openTrack();

        const free = prizeElement('B_free50');
        const premium = prizeElement('B_prem200');

        expect(free.dataset.state).toBe('claimable');
        expect(free.dataset.disabled).toBe('false');
        expect(free.querySelector('.hint').getAttribute('data-hint')).toBe('Click to claim');
        expect(premium.dataset.state).toBe('premium_locked');
        expect(premium.dataset.disabled).toBe('true');
        expect(premium.querySelector('.octane-reward-track-prize-lock')).toBeTruthy();
        expect(premium.querySelector('.hint').getAttribute('data-hint')).toBe('Premium reward - upgrade to claim it');

        fireEvent.click(free.querySelector('.octane-reward-track-prize-hit'));
        expect(mocks.claimPrize).toHaveBeenCalledWith('introduction', 'free50');

        // A premium-locked prize opens the premium confirmation instead of claiming.
        fireEvent.click(premium.querySelector('.octane-reward-track-prize-hit'));
        expect(mocks.claimPrize).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Buy')).toBeTruthy();
    });

    it('marks a claimed prize with the check and does not claim it again', () => {
        mocks.tracks = [makeTrack(60, true, [makePrize('free50', 50, false, true), makePrize('prem200', 200, true)])];
        render(<RewardTrackView />);
        openTrack();

        const free = prizeElement('B_free50');

        expect(free.dataset.state).toBe('claimed');
        expect(free.querySelector('.octane-reward-track-prize-check')).toBeTruthy();
        fireEvent.click(free.querySelector('.octane-reward-track-prize-hit'));
        expect(mocks.claimPrize).not.toHaveBeenCalled();
        expect(prizeElement('B_prem200').dataset.state).toBe('not_enough_points');
        expect(screen.getByText('1 / 2 rewards collected')).toBeTruthy();
    });

    it('opens on the page of the points and pages with the arrows, counting the claimable prizes elsewhere', () => {
        const prizes = [10, 20, 30, 40, 50, 60, 70, 80].map((points) => makePrize(`f${points}`, points, false));

        mocks.tracks = [makeTrack(65, false, prizes)];
        const { container } = render(<RewardTrackView />);

        openTrack();

        const previous = container.querySelector('.octane-reward-track-page[data-side="previous"]') as HTMLButtonElement;
        const next = container.querySelector('.octane-reward-track-page[data-side="next"]') as HTMLButtonElement;

        // 65 points belong to the second page (51-100).
        expect(screen.queryByTestId('badge-B_f10')).toBeNull();
        // Span 50 at 10.86px a point: 60 sits 10 points into the page, like 10 on the first.
        expect(prizeElement('B_f60').style.left).toBe('69px');
        expect(next.disabled).toBe(true);
        expect(previous.disabled).toBe(false);
        expect(container.querySelector('.octane-reward-track-unclaimed[data-side="previous"]').textContent).toBe('5');

        fireEvent.click(previous);

        expect(screen.getByTestId('badge-B_f10')).toBeTruthy();
        expect(screen.queryByTestId('badge-B_f60')).toBeNull();
        expect(previous.disabled).toBe(true);
        expect(container.querySelector('.octane-reward-track-unclaimed[data-side="next"]').textContent).toBe('1');
        // On the first page the bar is full: 65 points are past its last prize.
        expect((container.querySelector('.octane-reward-track-bar-fill') as HTMLElement).style.width).toBe('602px');
    });

    it('filters the tasks, follows the selection and opens the hint window', () => {
        mocks.tracks = [makeTrack(60)];
        const { container } = render(<RewardTrackView />);

        openTrack();

        const rows = () => [...container.querySelectorAll('.octane-reward-track-task')];

        expect(rows().length).toBe(2);
        expect(rows()[0].getAttribute('data-selected')).toBe('true');
        expect(container.querySelector('.octane-reward-track-task-glyph img')).toBeTruthy();

        fireEvent.click(screen.getByText('Open the Navigator'));
        expect(CreateLinkEvent).toHaveBeenCalledWith('navigator/show');

        fireEvent.click(rows()[1]);
        expect(rows()[1].getAttribute('data-selected')).toBe('true');
        // wave has no official hint button.
        expect(container.querySelector('.octane-reward-track-hint-button')).toBeNull();

        // "Completed" keeps only visit_rooms, so the selection falls back to it.
        fireEvent.click(screen.getByText('Completed'));
        expect(rows().length).toBe(1);
        expect(rows()[0].getAttribute('data-selected')).toBe('true');
        expect(container.querySelector('.octane-reward-track-task-info-name').textContent).toBe('visit_rooms');
    });

    it('shows the premium tip with its button until premium, then the plain tip', () => {
        mocks.tracks = [makeTrack(60)];
        const { container, unmount } = render(<RewardTrackView />);

        openTrack();
        expect(container.querySelector('.octane-reward-track-tip-premium')).toBeTruthy();
        fireEvent.click(container.querySelector('.octane-reward-track-get-premium'));
        expect(screen.getByText('Buy')).toBeTruthy();
        unmount();

        mocks.tracks = [makeTrack(60, true)];
        const second = render(<RewardTrackView />);

        openTrack();
        expect(second.container.querySelector('.octane-reward-track-tip-premium')).toBeNull();
        expect(second.container.querySelector('.octane-reward-track-tip-frank')).toBeTruthy();
    });

    it('lets staff (security 4+) copy the track id from the title and the task id from the task name', () => {
        mocks.tracks = [makeTrack(60)];
        const { container, unmount } = render(<RewardTrackView />);

        openTrack();
        expect(container.querySelector('.octane-reward-track-copy-region')).toBeNull();
        unmount();

        mocks.securityLevel = 4;
        const staff = render(<RewardTrackView />);

        openTrack();

        const regions = staff.container.querySelectorAll('.octane-reward-track-copy-region');

        expect(regions.length).toBe(2);
        fireEvent.click(staff.container.querySelector('.octane-reward-track-title'));
        expect(mocks.copyTrackId).toHaveBeenCalledWith('introduction');
        fireEvent.click(staff.container.querySelector('.octane-reward-track-task-info-name'));
        expect(mocks.copyTaskId).toHaveBeenCalledWith('visit_rooms');
    });

    it('animates the bars on progress while open and snaps them on a new track list', () => {
        const frames: FrameRequestCallback[] = [];
        let now = 0;

        vi.spyOn(performance, 'now').mockImplementation(() => now);
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
        vi.stubGlobal('cancelAnimationFrame', () => undefined);

        const flush = (ms: number) => {
            now += ms;

            const pending = frames.splice(0);

            act(() => pending.forEach((callback) => callback(now)));
        };

        const track = makeTrack(60);

        mocks.tracks = [track];
        const { container, rerender } = render(<RewardTrackView />);

        openTrack();

        const progress = () => (container.querySelector('.octane-reward-track-bar-progress') as HTMLElement).style.width;
        const taskBar = () => container.querySelectorAll('.octane-reward-track-task .octane-reward-track-mini-bar-progress')[1] as HTMLElement;
        const taskFill = () => container.querySelectorAll('.octane-reward-track-task .octane-reward-track-mini-bar-fill')[1] as HTMLElement;

        expect(progress()).toBe('60px');
        expect(taskBar().style.width).toBe('0px');

        // RewardTrackProgressMessageEvent: 100 points and wave_at_user 5 / 5, same track list.
        const updated = { ...track, points: 100, tasks: [track.tasks[0], makeTask('wave_at_user', 'wave', 5, 5)] };

        mocks.tracks = [updated];
        rerender(<RewardTrackView />);

        expect(progress()).toBe('60px');
        flush(16);
        expect(parseInt(progress(), 10)).toBeGreaterThan(60);

        for (let frame = 0; frame < 120; frame++) flush(16);

        expect(progress()).not.toBe('60px');
        expect(taskBar().style.width).toBe('200px');
        expect(taskFill().style.backgroundColor).toBe('rgb(113, 175, 36)');

        // A new RewardTracksMessageEvent rebuilds the views: the bar jumps.
        mocks.tracksVersion = 2;
        mocks.tracks = [{ ...updated, points: 60 }];
        rerender(<RewardTrackView />);
        expect(progress()).toBe('60px');

        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('keeps the staff gear for acc_rewardtrack', () => {
        mocks.isEditor = true;
        mocks.tracks = [makeTrack(0)];
        render(<RewardTrackView />);
        openTrack();

        fireEvent.click(screen.getByTestId('reward-track-admin-toggle'));
        expect(screen.getByTestId('admin')).toBeTruthy();
    });
});
