import { IssueMessageData, ReleaseIssuesMessageComposer } from '@octane/renderer';
import { FC, useRef } from 'react';
import { FaSignOutAlt } from 'react-icons/fa';
import { LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { Button } from '../../../../common';
import { ModToolsIssueTableView } from './ModToolsIssueTableView';

interface ModToolsMyIssuesTabViewProps {
    myIssues: IssueMessageData[];
    allIssues: IssueMessageData[];
    getOpenMilliseconds: (issue: IssueMessageData) => number;
    handleIssue: (issueId: number) => void;
}

export const ModToolsMyIssuesTabView: FC<ModToolsMyIssuesTabViewProps> = (props) => {
    const { myIssues = null, allIssues = [], getOpenMilliseconds = null, handleIssue = null } = props;
    const pendingReleasesRef = useRef<Set<number>>(new Set());

    const releaseIssues = (issueIds: number[]) => {
        const fresh = issueIds.filter((issueId) => !pendingReleasesRef.current.has(issueId));

        if (!fresh.length) return;

        for (const issueId of fresh) pendingReleasesRef.current.add(issueId);

        SendMessageComposer(new ReleaseIssuesMessageComposer(fresh));

        setTimeout(() => {
            for (const issueId of fresh) pendingReleasesRef.current.delete(issueId);
        }, 2000);
    };

    const issues = myIssues || [];

    return (
        <div className="flex flex-col gap-1.5">
            <ModToolsIssueTableView
                actionsWidth="150px"
                allIssues={allIssues}
                emptyText={LocalizeText('modtools.tickets.empty.mine')}
                getOpenMilliseconds={getOpenMilliseconds}
                issues={issues}
                renderActions={(issue) => (
                    <>
                        <button
                            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                            type="button"
                            onClick={() => handleIssue(issue.issueId)}
                        >
                            <div className="octane-icon icon-room-tools shrink-0" /> {LocalizeText('modtools.tickets.action.handle')}
                        </button>
                        <button
                            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                            type="button"
                            onClick={() => releaseIssues([issue.issueId])}
                        >
                            <FaSignOutAlt size={10} /> {LocalizeText('modtools.tickets.action.release')}
                        </button>
                    </>
                )}
                rowHoverClass="hover:bg-sky-50/50"
                showMessageCount
                typeBadgeClass="bg-sky-50 text-sky-800 border-sky-200"
            />
            {/* "release all" sits under the list in the official browser and hands every held issue back at once */}
            <div className="flex justify-end">
                <Button disabled={!issues.length} gap={1} variant="secondary" onClick={() => releaseIssues(issues.map((issue) => issue.issueId))}>
                    <FaSignOutAlt size={10} /> {localizeWithFallback('modtools.tickets.action.release_all', 'Release all')}
                </Button>
            </div>
        </div>
    );
};
