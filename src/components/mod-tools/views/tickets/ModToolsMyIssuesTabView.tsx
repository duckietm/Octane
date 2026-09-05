import { IssueMessageData, ReleaseIssuesMessageComposer } from '@octane/renderer';
import { FC, useRef } from 'react';
import { FaClock, FaInbox, FaSignOutAlt, FaTools, FaUser } from 'react-icons/fa';
import { GetIssueCategoryName, LocalizeText, SendMessageComposer } from '../../../../api';

interface ModToolsMyIssuesTabViewProps {
    myIssues: IssueMessageData[];
    handleIssue: (issueId: number) => void;
}

export const ModToolsMyIssuesTabView: FC<ModToolsMyIssuesTabViewProps> = (props) => {
    const { myIssues = null, handleIssue = null } = props;
    const pendingReleasesRef = useRef<Set<number>>(new Set());

    const releaseIssue = (issueId: number) => {
        if (pendingReleasesRef.current.has(issueId)) return;

        pendingReleasesRef.current.add(issueId);
        SendMessageComposer(new ReleaseIssuesMessageComposer([issueId]));

        setTimeout(() => pendingReleasesRef.current.delete(issueId), 2000);
    };

    const isEmpty = !myIssues || myIssues.length === 0;

    return (
        <div className="flex flex-col gap-1 overflow-hidden">
            <div className="min-w-0 overflow-x-auto">
                <div className="min-w-[500px]">
                    <div className="grid grid-cols-[100px_1fr_100px_90px_90px] gap-2 text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1 px-1">
                        <div>{LocalizeText('modtools.tickets.column.type')}</div>
                        <div className="flex items-center gap-1">
                            <FaUser size={10} /> {LocalizeText('modtools.tickets.column.reported')}
                        </div>
                        <div className="flex items-center gap-1">
                            <FaClock size={10} /> {LocalizeText('modtools.tickets.column.opened')}
                        </div>
                        <div></div>
                        <div></div>
                    </div>
                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center gap-1 py-8 opacity-50 text-sm">
                            <FaInbox size={22} />
                            <span>{LocalizeText('modtools.tickets.empty.mine')}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col overflow-auto">
                            {myIssues.map((issue) => (
                                <div
                                    key={issue.issueId}
                                    className="grid grid-cols-[100px_1fr_100px_90px_90px] gap-2 items-center px-1 py-1.5 text-sm border-b border-zinc-100 even:bg-black/[0.02] hover:bg-sky-50/50 transition-colors"
                                >
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-sky-50 text-sky-800 border-sky-200 w-fit">
                                        {GetIssueCategoryName(issue.categoryId)}
                                    </span>
                                    <span className="font-medium truncate">{issue.reportedUserName}</span>
                                    <span className="font-mono text-[.75rem] opacity-70 tabular-nums">
                                        {new Date(Date.now() - issue.issueAgeInMilliseconds).toLocaleTimeString()}
                                    </span>
                                    <button
                                        className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                                        onClick={() => handleIssue(issue.issueId)}
                                    >
                                        <FaTools size={10} /> {LocalizeText('modtools.tickets.action.handle')}
                                    </button>
                                    <button
                                        className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                                        onClick={() => releaseIssue(issue.issueId)}
                                    >
                                        <FaSignOutAlt size={10} /> {LocalizeText('modtools.tickets.action.release')}
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
