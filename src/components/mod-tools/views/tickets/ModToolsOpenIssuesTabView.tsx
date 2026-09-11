import { IssueMessageData, PickIssuesMessageComposer } from '@octane/renderer';
import { FC, useRef } from 'react';
import { FaHandPointer } from 'react-icons/fa';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { ModToolsIssueTableView } from './ModToolsIssueTableView';

interface ModToolsOpenIssuesTabViewProps {
    openIssues: IssueMessageData[];
    allIssues: IssueMessageData[];
    getOpenMilliseconds: (issue: IssueMessageData) => number;
}

export const ModToolsOpenIssuesTabView: FC<ModToolsOpenIssuesTabViewProps> = (props) => {
    const { openIssues = null, allIssues = [], getOpenMilliseconds = null } = props;
    const pendingPicksRef = useRef<Set<number>>(new Set());

    const pickIssue = (issueId: number) => {
        if (pendingPicksRef.current.has(issueId)) return;

        pendingPicksRef.current.add(issueId);
        SendMessageComposer(new PickIssuesMessageComposer([issueId], false, 0, 'pick issue button'));

        setTimeout(() => pendingPicksRef.current.delete(issueId), 2000);
    };

    return (
        <ModToolsIssueTableView
            actionsWidth="70px"
            allIssues={allIssues}
            emptyText={LocalizeText('modtools.tickets.empty.open')}
            getOpenMilliseconds={getOpenMilliseconds}
            issues={openIssues || []}
            renderActions={(issue) => (
                <button
                    className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    type="button"
                    onClick={() => pickIssue(issue.issueId)}
                >
                    <FaHandPointer size={10} /> {LocalizeText('modtools.tickets.action.pick')}
                </button>
            )}
            rowHoverClass="hover:bg-amber-50/50"
            typeBadgeClass="bg-amber-50 text-amber-800 border-amber-200"
        />
    );
};
