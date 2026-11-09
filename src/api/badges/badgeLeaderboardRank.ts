import { BadgeLeaderboardResponse } from './BadgeLeaderboardApi';

/**
 * A user's place on the total-badges leaderboard, as the official infostand
 * ("Badges rank #N") and extended profile ("(#N)") show it. The server does
 * not send the rank with the user, so it is read from the badge leaderboard
 * the client already caches: the viewer entry for the own user, the top
 * entries for anybody else. -1 means "unknown", which hides the rank like the
 * official client does for a negative value.
 */
export const getBadgesRank = (leaderboard: BadgeLeaderboardResponse | null, userId: number): number => {
    const board = leaderboard?.leaderboards?.totalBadges;

    if (!board || !Number.isInteger(userId) || userId <= 0) return -1;

    if (leaderboard.viewerUserId === userId) {
        const rank = board.viewerEntry?.rank;

        if (Number.isInteger(rank) && rank > 0) return rank;
    }

    const entry = (board.entries || []).find((candidate) => candidate && candidate.userId === userId);

    return entry && Number.isInteger(entry.rank) && entry.rank > 0 ? entry.rank : -1;
};
