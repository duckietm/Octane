import { IgnoreUserIdComposer, RemoveFriendComposer } from '@octane/renderer';

/**
 * Topics whose report must not touch the relationship with the reported
 * user. The official client keeps this list at `HabboHelp.TOPICS_WITHOUT_IGNORE_AND_UNFRIEND`;
 * topic 21 is the one where the reporter and the reported user stay in contact.
 */
export const TOPICS_WITHOUT_IGNORE_AND_UNFRIEND: readonly number[] = [21];

/**
 * Whether a sent report should also ignore and unfriend the reported user,
 * as the official client does right after every call for help.
 */
export const shouldIgnoreAndUnfriendReportedUser = (reportedUserId: number, cfhTopic: number): boolean =>
    reportedUserId > 0 && !TOPICS_WITHOUT_IGNORE_AND_UNFRIEND.includes(cfhTopic);

/**
 * The messages that follow a report: the ignore always goes out, the
 * removal only when the reported user is on the friend list.
 */
export const buildReportFollowUpComposers = (reportedUserId: number, isFriend: boolean): (IgnoreUserIdComposer | RemoveFriendComposer)[] => {
    const composers: (IgnoreUserIdComposer | RemoveFriendComposer)[] = [new IgnoreUserIdComposer(reportedUserId)];

    if (isFriend) composers.push(new RemoveFriendComposer(reportedUserId));

    return composers;
};
