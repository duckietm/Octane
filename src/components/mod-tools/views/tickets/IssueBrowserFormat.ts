/** The slice of an issue the browser columns and the auto-pick need; `IssueMessageData` satisfies it. */
export interface IssueBrowserEntry {
    issueId: number;
    state: number;
    priority: number;
    groupingId: number;
    issueAgeInMilliseconds: number;
    reportedUserId: number;
    pickerUserId: number;
    message: string;
}

/** Issue states as the server numbers them (`IssueMessageData.STATE_*`). */
export const ISSUE_STATE_OPEN = 1;
export const ISSUE_STATE_PICKED = 2;

/**
 * The official browser shows how long an issue has been open as `mm:ss`. Minutes are not
 * folded into hours because the column is 45px wide and an issue older than an hour is
 * already a problem the number should shout about.
 */
export const formatIssueOpenTime = (openMilliseconds: number): string => {
    const totalSeconds = Math.max(0, Math.floor((Number.isFinite(openMilliseconds) ? openMilliseconds : 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

/**
 * The packet carries the issue's age at the moment it was sent; the browser keeps counting
 * from the moment the packet arrived so the column moves without another request.
 */
export const getIssueOpenMilliseconds = (ageInMilliseconds: number, receivedAt: number, now: number): number =>
    Math.max(0, ageInMilliseconds) + Math.max(0, now - receivedAt);

/**
 * "Give me the next priority issue" as `IssueManager.autoPick` chooses it: among the open
 * issues the lowest priority number wins, and between equal priorities the one with the
 * smaller age. Returns null when there is nothing open.
 */
export const pickNextPriorityIssue = <T extends IssueBrowserEntry>(issues: T[]): T | null => {
    let best: T = null;

    for (const issue of issues || []) {
        if (!issue || issue.state !== ISSUE_STATE_OPEN) continue;

        if (best === null || issue.priority < best.priority || (issue.priority === best.priority && issue.issueAgeInMilliseconds < best.issueAgeInMilliseconds))
            best = issue;
    }

    return best;
};

/** Every issue the given moderator currently holds, which is what "release all" hands back. */
export const getIssueIdsPickedBy = (issues: IssueBrowserEntry[], pickerUserId: number): number[] =>
    (issues || []).filter((issue) => issue && issue.state === ISSUE_STATE_PICKED && issue.pickerUserId === pickerUserId).map((issue) => issue.issueId);

/**
 * The official browser bundles reports about the same user (same grouping and reported
 * user, same state and picker) and its "msgs" column counts how many of those carry a
 * message. An issue without a grouping id stands alone, as `IssueBundle.matches` insists.
 */
export const countBundledMessages = (issues: IssueBrowserEntry[], issue: IssueBrowserEntry): number => {
    if (!issue) return 0;

    const hasMessage = (entry: IssueBrowserEntry) => !!entry.message && entry.message.length > 0;

    if (!issue.groupingId) return hasMessage(issue) ? 1 : 0;

    return (issues || []).filter(
        (entry) =>
            entry &&
            entry.groupingId === issue.groupingId &&
            entry.reportedUserId === issue.reportedUserId &&
            entry.state === issue.state &&
            entry.pickerUserId === issue.pickerUserId &&
            hasMessage(entry)
    ).length;
};

/** Browser rows are ordered by score first and then by age, mirroring `IssueListView.update`. */
export const sortIssuesForBrowser = <T extends IssueBrowserEntry>(issues: T[]): T[] =>
    [...(issues || [])].sort((a, b) => a.priority - b.priority || a.issueAgeInMilliseconds - b.issueAgeInMilliseconds);
