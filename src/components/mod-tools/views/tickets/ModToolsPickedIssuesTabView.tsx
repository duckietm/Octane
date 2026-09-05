import { IssueMessageData } from '@octane/renderer';
import { FC } from 'react';
import { FaClock, FaInbox, FaUser, FaUserShield } from 'react-icons/fa';
import { GetIssueCategoryName, LocalizeText } from '../../../../api';

interface ModToolsPickedIssuesTabViewProps {
    pickedIssues: IssueMessageData[];
}

export const ModToolsPickedIssuesTabView: FC<ModToolsPickedIssuesTabViewProps> = (props) => {
    const { pickedIssues = null } = props;
    const isEmpty = !pickedIssues || pickedIssues.length === 0;

    return (
        <div className="flex flex-col gap-1 overflow-hidden">
            <div className="min-w-0 overflow-x-auto">
                <div className="min-w-[460px]">
                    <div className="grid grid-cols-[100px_1fr_100px_120px] gap-2 text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1 px-1">
                        <div>{LocalizeText('modtools.tickets.column.type')}</div>
                        <div className="flex items-center gap-1">
                            <FaUser size={10} /> {LocalizeText('modtools.tickets.column.reported')}
                        </div>
                        <div className="flex items-center gap-1">
                            <FaClock size={10} /> {LocalizeText('modtools.tickets.column.opened')}
                        </div>
                        <div className="flex items-center gap-1">
                            <FaUserShield size={10} /> {LocalizeText('modtools.tickets.column.picker')}
                        </div>
                    </div>
                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center gap-1 py-8 opacity-50 text-sm">
                            <FaInbox size={22} />
                            <span>{LocalizeText('modtools.tickets.empty.picked')}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col overflow-auto">
                            {pickedIssues.map((issue) => (
                                <div
                                    key={issue.issueId}
                                    className="grid grid-cols-[100px_1fr_100px_120px] gap-2 items-center px-1 py-1.5 text-sm border-b border-zinc-100 even:bg-black/[0.02]"
                                >
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-zinc-50 text-zinc-700 border-zinc-200 w-fit">
                                        {GetIssueCategoryName(issue.categoryId)}
                                    </span>
                                    <span className="font-medium truncate">{issue.reportedUserName}</span>
                                    <span className="font-mono text-[.75rem] opacity-70 tabular-nums">
                                        {new Date(Date.now() - issue.issueAgeInMilliseconds).toLocaleTimeString()}
                                    </span>
                                    <span className="truncate font-medium opacity-80">{issue.pickerUserName}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
