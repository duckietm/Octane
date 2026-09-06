import { BadgeLeaderboardResponse } from '../../../../../api';

/**
 * The official infostand shows "Badges rank #N" under the achievement
 * score (InfoStandUserView.as, setBadgesRank). Our server does not put
 * the rank in the room user data, so it is read from the badge
 * leaderboard the client already caches: the viewer entry for the own
 * user, the top entries for anybody else. -1 means "unknown", which
 * hides the line like the official client does for a negative rank.
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

/**
 * The real name line is only rendered when the server exposes one; the
 * official client hides the row for an empty string (setRealName).
 */
export const getRealNameLine = (realName: string | null | undefined): string => (realName || '').trim();
