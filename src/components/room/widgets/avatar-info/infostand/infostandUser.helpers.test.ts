import { describe, expect, it } from 'vitest';
import { BadgeLeaderboardResponse } from '../../../../../api';
import { getBadgesRank, getRealNameLine, getUserHomePageUrl } from './infostandUser.helpers';

const leaderboard = {
    viewerUserId: 7,
    leaderboards: {
        totalBadges: {
            entries: [
                { userId: 1, username: 'first', figure: '', score: 90, rank: 1 },
                { userId: 2, username: 'second', figure: '', score: 80, rank: 2 }
            ],
            totalPlayers: 300,
            viewerEntry: { userId: 7, rank: 42 }
        }
    }
} as unknown as BadgeLeaderboardResponse;

describe('infostandUser.helpers', () => {
    it('reads the viewer rank from the viewer entry', () => {
        expect(getBadgesRank(leaderboard, 7)).toBe(42);
    });

    it('reads another user rank from the top entries', () => {
        expect(getBadgesRank(leaderboard, 2)).toBe(2);
    });

    it('returns -1 when the rank is unknown or the leaderboard is missing', () => {
        expect(getBadgesRank(leaderboard, 99)).toBe(-1);
        expect(getBadgesRank(null, 7)).toBe(-1);
        expect(getBadgesRank(leaderboard, 0)).toBe(-1);
    });

    it('trims the real name and turns a missing one into an empty line', () => {
        expect(getRealNameLine('  John Doe ')).toBe('John Doe');
        expect(getRealNameLine(null)).toBe('');
        expect(getRealNameLine('   ')).toBe('');
    });
});

describe('getUserHomePageUrl', () => {
    it('fills the official userpage format with id and name', () => {
        expect(getUserHomePageUrl('https://hotel.test/home/%username%?id=%ID%', 12, 'Simo Leo')).toBe('https://hotel.test/home/Simo%20Leo?id=12');
    });

    it('returns an empty url without a format or a valid user', () => {
        expect(getUserHomePageUrl('', 12, 'Simo')).toBe('');
        expect(getUserHomePageUrl(undefined, 12, 'Simo')).toBe('');
        expect(getUserHomePageUrl('https://hotel.test/%ID%', 0, 'Simo')).toBe('');
    });
});
