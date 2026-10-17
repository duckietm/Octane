/* @vitest-environment jsdom */

import { AddLinkEventTracker } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgeLeaderboardResponse } from '../../api';
import { BadgeLeaderboardView } from './BadgeLeaderboardView';

const board = { entries: [], totalPlayers: 0 };
const response = {
    viewerUserId: 0,
    badgeStats: [],
    thresholds: {},
    leaderboards: { totalBadges: board, achievementLevel: board, rarity: {} }
} as unknown as BadgeLeaderboardResponse;

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
