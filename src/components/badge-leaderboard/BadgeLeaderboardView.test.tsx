/* @vitest-environment jsdom */

import { AddLinkEventTracker } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgeLeaderboardResponse } from '../../api';
import { BadgeLeaderboardView } from './BadgeLeaderboardView';

const board = { entries: [], totalPlayers: 0 };
const response: BadgeLeaderboardResponse = {
    viewerUserId: 0,
    badgeStats: [],
    thresholds: {},
    leaderboards: { totalBadges: board, achievementLevel: board, rarity: {} }
} as unknown as BadgeLeaderboardResponse;
const emptyLeaderboards = response.leaderboards;

vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api')>()),
    fetchBadgeLeaderboard: vi.fn(async () => response),
    getCachedBadgeLeaderboard: vi.fn(() => response),
    LocalizeText: (key: string) => key
}));

const open = () => {
    const tracker = vi.mocked(AddLinkEventTracker).mock.calls.at(-1)?.[0] as { linkReceived: (url: string) => void };

    act(() => tracker.linkReceived('badge-leaderboard/show'));
};

describe('BadgeLeaderboardView category dropdown', () => {
    beforeEach(() => vi.mocked(AddLinkEventTracker).mockClear());
    afterEach(cleanup);

    it('lists the categories, switches on pick and closes on Escape', async () => {
        render(<BadgeLeaderboardView />);
        open();

        const trigger = await screen.findByRole('combobox');

        expect(trigger).toHaveTextContent('badge_leaderboard.title.total_badges');

        fireEvent.click(trigger);

        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
            'badge_leaderboard.option.total_badges',
            'badge_leaderboard.option.achievement_level'
        ]);

        const achievement = screen.getByRole('option', { name: 'badge_leaderboard.option.achievement_level' });

        fireEvent.pointerDown(achievement);
        fireEvent.click(achievement);

        await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('badge_leaderboard.title.achievement_level'));
        expect(screen.queryByRole('option')).toBeNull();

        fireEvent.click(screen.getByRole('combobox'));
        expect(screen.getAllByRole('option')).toHaveLength(2);

        fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

        await waitFor(() => expect(screen.queryByRole('option')).toBeNull());
    });
});

describe('BadgeLeaderboardView ranking', () => {
    const entry = (userId: number, rank: number, score: number) => ({ userId, rank, score, username: `user${userId}`, figure: '' });
    const names = () => Array.from(document.querySelectorAll('.octane-badge-leaderboard__username')).map((node) => node.textContent);
    const showBoard = (entries: ReturnType<typeof entry>[], viewerEntry: ReturnType<typeof entry>) => {
        const total = { entries, totalPlayers: entries.length, viewerEntry };

        response.viewerUserId = viewerEntry.userId;
        response.leaderboards = { totalBadges: total, achievementLevel: board, rarity: {} } as unknown as BadgeLeaderboardResponse['leaderboards'];
    };

    beforeEach(() => vi.mocked(AddLinkEventTracker).mockClear());
    afterEach(() => {
        cleanup();
        response.viewerUserId = 0;
        response.leaderboards = emptyLeaderboards;
    });

    it('keeps the viewer at their place in the ranking', async () => {
        showBoard([entry(1, 1, 36), entry(2, 2, 14), entry(3, 3, 3)], entry(1, 1, 36));
        render(<BadgeLeaderboardView />);
        open();

        await screen.findByRole('combobox');

        expect(names()).toEqual(['user1', 'user2', 'user3']);
        expect(document.querySelectorAll('.is-current-user')).toHaveLength(1);
        expect(document.querySelector('.is-current-user .octane-badge-leaderboard__username')).toHaveTextContent('user1');
    });

    it('adds the viewer below the page when they are not on it', async () => {
        showBoard([entry(2, 1, 14), entry(3, 2, 3)], entry(9, 40, 1));
        render(<BadgeLeaderboardView />);
        open();

        await screen.findByRole('combobox');

        expect(names()).toEqual(['user2', 'user3', 'user9']);
        expect(document.querySelector('.is-current-user .octane-badge-leaderboard__username')).toHaveTextContent('user9');
    });
});
