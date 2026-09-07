import { IssueMessageData, PickIssuesMessageComposer } from '@octane/renderer';
import { FC, useRef } from 'react';
import { FaClock, FaHandPointer, FaInbox, FaUser } from 'react-icons/fa';
import { GetIssueCategoryName, LocalizeText, SendMessageComposer } from '../../../../api';

interface ModToolsOpenIssuesTabViewProps {
    openIssues: IssueMessageData[];
}

export const ModToolsOpenIssuesTabView: FC<ModToolsOpenIssuesTabViewProps> = (props) => {
    const { openIssues = null } = props;
    const pendingPicksRef = useRef<Set<number>>(new Set());

    const pickIssue = (issueId: number) => {
        if (pendingPicksRef.current.has(issueId)) return;

        pendingPicksRef.current.add(issueId);
        SendMessageComposer(new PickIssuesMessageComposer([issueId], false, 0, 'pick issue button'));

        setTimeout(() => pendingPicksRef.current.delete(issueId), 2000);
    };

    const isEmpty = !openIssues || openIssues.length === 0;

    return (
        <div className="flex flex-col gap-1 overflow-hidden">
            <div className="min-w-0 overflow-x-auto">
                <div className="min-w-[420px]">
                    <div className="grid grid-cols-[100px_1fr_100px_100px] gap-2 text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1 px-1">
                        <div>{LocalizeText('modtools.tickets.column.type')}</div>
                        <div className="flex items-center gap-1">
                            <FaUser size={10} /> {LocalizeText('modtools.tickets.column.reported')}
                        </div>
                        <div className="flex items-center gap-1">
                            <FaClock size={10} /> {LocalizeText('modtools.tickets.column.opened')}
                        </div>
                        <div></div>
                    </div>
                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center gap-1 py-8 opacity-50 text-sm">
                            <FaInbox size={22} />
                            <span>{LocalizeText('modtools.tickets.empty.open')}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col overflow-auto">
                            {openIssues.map((issue) => (
                                <div
                                    key={issue.issueId}
                                    className="grid grid-cols-[100px_1fr_100px_100px] gap-2 items-center px-1 py-1.5 text-sm border-b border-zinc-100 even:bg-black/[0.02] hover:bg-amber-50/50 transition-colors"
                                >
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-800 border-amber-200 w-fit">
                                        {GetIssueCategoryName(issue.categoryId)}
                                    </span>
                                    <span className="font-medium truncate">{issue.reportedUserName}</span>
                                    <span className="font-mono text-[.75rem] opacity-70 tabular-nums">
                                        {new Date(Date.now() - issue.issueAgeInMilliseconds).toLocaleTimeString()}
                                    </span>
                                    <button
                                        className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                        onClick={() => pickIssue(issue.issueId)}
                                    >
                                        <FaHandPointer size={10} /> {LocalizeText('modtools.tickets.action.pick')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
