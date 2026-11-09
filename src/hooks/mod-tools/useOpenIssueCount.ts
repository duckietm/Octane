import { useMemo } from 'react';
import { ISSUE_STATE_OPEN, TrackedIssue, useIssueManagerStore } from './issueManagerStore';

/** The individual issues (not the bundles they are shown in) that are still open. */
export const countOpenIssues = (issues: ReadonlyMap<number, TrackedIssue>): number => {
    let count = 0;

    for (const tracked of issues.values()) {
        if (tracked?.issue?.state === ISSUE_STATE_OPEN) count++;
    }

    return count;
};

/** The open issue count of the issue manager. The manager's maps are mutated in place and every change bumps `version`, which is what re-counts here. */
export const useOpenIssueCount = (): number => {
    const version = useIssueManagerStore((state) => state.version);

    return useMemo(() => countOpenIssues(useIssueManagerStore.getState().issues), [version]);
};
