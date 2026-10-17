import { IssueMessageData, PickIssuesMessageComposer } from '@octane/renderer';
import { FC, useMemo, useRef } from 'react';
import { GetIssueCategoryName, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';

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

    // The classic issue browser lists the issues by score, highest first.
    const sortedIssues = useMemo(() => (openIssues ? [...openIssues].sort((a, b) => b.priority - a.priority || b.issueAgeInMilliseconds - a.issueAgeInMilliseconds) : []), [openIssues]);

    const isEmpty = sortedIssues.length === 0;

    return (
        <div className="flex flex-col gap-1 overflow-hidden">
            {!isEmpty && (
                <BaseButton
                    className="octane-mod-tools-button octane-mod-tools-button--green self-end"
                    onClick={() => pickIssue(sortedIssues[0].issueId)}
                >
                    {localizeWithFallback('modtools.tickets.action.pick.next', 'Give me the next priority issue')}
                </BaseButton>
            )}
            <div className="min-w-0 overflow-x-auto">
                <div className="min-w-[470px]">
                    <div className="grid grid-cols-[44px_100px_1fr_100px_100px] gap-2 text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1 px-1">
                        <div>{localizeWithFallback('modtools.tickets.column.score', 'Score')}</div>
                        <div>{LocalizeText('modtools.tickets.column.type')}</div>
                        <div className="flex items-center gap-1">
                            {LocalizeText('modtools.tickets.column.reported')}
                        </div>
                        <div className="flex items-center gap-1">
                            {LocalizeText('modtools.tickets.column.opened')}
                        </div>
                        <div></div>
                    </div>
                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center gap-1 py-8 opacity-50 text-sm">
                            
                            <span>{LocalizeText('modtools.tickets.empty.open')}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col overflow-auto octane-mod-tools-list-auto">
                            {sortedIssues.map((issue) => (
                                <div
                                    key={issue.issueId}
                                    className="grid grid-cols-[44px_100px_1fr_100px_100px] gap-2 items-center px-1 py-1.5 text-sm border-b border-zinc-100 even:bg-black/[0.02] hover:bg-amber-50/50 transition-colors"
                                >
                                    <span className="font-mono text-[.75rem] tabular-nums">{issue.priority}</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-800 border-amber-200 w-fit">
                                        {GetIssueCategoryName(issue.categoryId)}
                                    </span>
                                    <span className="font-medium truncate">{issue.reportedUserName}</span>
                                    <span className="font-mono text-[.75rem] opacity-70 tabular-nums">
                                        {new Date(Date.now() - issue.issueAgeInMilliseconds).toLocaleTimeString()}
                                    </span>
                                    <BaseButton
                                        className="octane-mod-tools-button octane-mod-tools-button--green"
                                        onClick={() => pickIssue(issue.issueId)}
                                    >
                                        {LocalizeText('modtools.tickets.action.pick')}
                                    </BaseButton>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
