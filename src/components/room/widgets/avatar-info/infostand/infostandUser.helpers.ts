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

/**
 * The official infostand home icon opens the user's Habbo Home page in the
 * browser (InfoStandWidgetHandler, RWUAM_OPEN_HOME_PAGE ->
 * SessionDataManager.openHabboHomePage): the `link.format.userpage`
 * property with %ID% / %username% filled in. Without the property the
 * official does nothing; we fall back to the in-client profile instead.
 */
export const getUserHomePageUrl = (format: string | null | undefined, userId: number, username: string | null | undefined): string => {
    const template = (format || '').trim();

    if (!template || !Number.isInteger(userId) || userId <= 0) return '';

    return template.replace(/%ID%/g, String(userId)).replace(/%username%/g, encodeURIComponent((username || '').trim()));
};
