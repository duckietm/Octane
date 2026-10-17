import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SnowWarLeaderboardView } from './SnowWarLeaderboardView';

const mocks = vi.hoisted(() => ({ snowWar: null as any, profile: vi.fn(), group: vi.fn() }));

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LocalizeText: (key: string) => key,
    GetSessionDataManager: () => ({ userId: 42 }),
    GetUserProfile: mocks.profile,
    GetGroupInformation: mocks.group
}));

vi.mock('../../../../common', () => ({
    LayoutAvatarImageView: () => <div />,
    LayoutBadgeImageView: () => <div />
}));

vi.mock('../../../../hooks', () => ({ useSnowWar: () => mocks.snowWar }));

const entry = (userId: number, rank: number, gender = 'M') => ({ userId, rank, score: 1000 - rank, name: `name${ userId }`, figure: 'hd', gender });

describe('SnowWarLeaderboardView (AIR LeaderboardViewController)', () =>
{
    beforeEach(() =>
    {
        mocks.profile.mockReset();
        mocks.snowWar = {
            leaderboard: {
                isOpen: true, weekly: true, friendsOnly: false, groups: false, favouriteGroupId: -1, loading: false,
                year: 2026, week: 42, maxOffset: 2, currentOffset: 0, minutesUntilReset: 60, totalListSize: 3,
                entries: [ entry(1, 1), entry(2, 2), entry(42, 9) ]
            },
            requestLeaderboard: vi.fn(),
            closeLeaderboard: vi.fn()
        };
    });

    afterEach(() => cleanup());

    it('switches category and period the AIR way', () =>
    {
        render(<SnowWarLeaderboardView />);

        fireEvent.click(screen.getByText('Friends Scores'));
        expect(mocks.snowWar.requestLeaderboard).toHaveBeenLastCalledWith(true, true, 0, false);

        fireEvent.click(screen.getByText('All time'));
        expect(mocks.snowWar.requestLeaderboard).toHaveBeenLastCalledWith(false, false, 0, false);

        fireEvent.click(screen.getByText('Groups'));
        expect(mocks.snowWar.requestLeaderboard).toHaveBeenLastCalledWith(true, false, 0, true);
    });

    it('goes back a week with the left arrow and shows no forward arrow on the current week', () =>
    {
        render(<SnowWarLeaderboardView />);

        expect(screen.queryByLabelText('Next week')).toBeNull();
        fireEvent.click(screen.getByLabelText('Previous week'));
        expect(mocks.snowWar.requestLeaderboard).toHaveBeenLastCalledWith(true, false, 1, false);
    });

    it('highlights the own row and opens a profile from a head', () =>
    {
        const { container } = render(<SnowWarLeaderboardView />);

        expect(container.querySelector('.snowwar-leaderboard__row.is-own')?.textContent).toContain('name42');
        fireEvent.click(container.querySelectorAll('.snowwar-leaderboard__avatar')[0]);
        expect(mocks.profile).toHaveBeenCalledWith(1);
    });

    it('opens a group from a group row', () =>
    {
        mocks.snowWar.leaderboard = { ...mocks.snowWar.leaderboard, groups: true, favouriteGroupId: 7, entries: [ entry(7, 1, 'g') ] };
        const { container } = render(<SnowWarLeaderboardView />);

        expect(container.querySelector('.snowwar-leaderboard__row.is-own')).not.toBeNull();
        fireEvent.click(container.querySelector('.snowwar-leaderboard__avatar'));
        expect(mocks.group).toHaveBeenCalledWith(7);
    });
});
