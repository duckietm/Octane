import { IssueMessageData } from '@octane/renderer';
import { FC, ReactNode } from 'react';
import { FaClock, FaCommentDots, FaDoorOpen, FaInbox, FaUser, FaUserShield } from 'react-icons/fa';
import { GetIssueCategoryName, LocalizeText, localizeWithFallback } from '../../../../api';
import { countBundledMessages, formatIssueOpenTime, sortIssuesForBrowser } from './IssueBrowserFormat';

interface ModToolsIssueTableViewProps {
    /** The rows to show, already filtered by state. */
    issues: IssueMessageData[];
    /** Every issue the moderator knows about, so the "msgs" column can count a whole bundle. */
    allIssues: IssueMessageData[];
    /** How long the issue has been open right now, in milliseconds. */
    getOpenMilliseconds: (issue: IssueMessageData) => number;
    emptyText: string;
    showMessageCount?: boolean;
    showPicker?: boolean;
    /** Per-row buttons; the column is omitted when nothing is returned for any row. */
    renderActions?: (issue: IssueMessageData) => ReactNode;
    actionsWidth?: string;
    rowHoverClass?: string;
    typeBadgeClass?: string;
}

/**
 * The official issue browser lists score, category, source, target, open time and (for the
 * moderator's own issues) message count; every tab shares the table and differs only in
 * the trailing columns.
 */
export const ModToolsIssueTableView: FC<ModToolsIssueTableViewProps> = (props) => {
    const {
        issues = [],
        allIssues = [],
        getOpenMilliseconds = null,
        emptyText = '',
        showMessageCount = false,
        showPicker = false,
        renderActions = null,
        actionsWidth = '0px',
        rowHoverClass = '',
        typeBadgeClass = 'bg-zinc-50 text-zinc-700 border-zinc-200'
    } = props;
    // Column widths go through an inline style: Tailwind cannot see a class assembled at
    // runtime, so `grid-cols-[...]` built from props would never be generated.
    const gridStyle = {
        gridTemplateColumns: [
            '44px',
            'minmax(90px,1fr)',
            '90px',
            'minmax(100px,1fr)',
            '58px',
            showMessageCount ? '44px' : null,
            showPicker ? '110px' : null,
            renderActions ? actionsWidth : null
        ]
            .filter((column) => !!column)
            .join(' ')
    };
    const gridClass = 'grid gap-2 items-center px-1';
    const rows = sortIssuesForBrowser(issues || []);
    const isEmpty = rows.length === 0;

    return (
        <div className="flex flex-col gap-1 overflow-hidden">
            <div className="min-w-0 overflow-x-auto">
                <div className="min-w-[520px]">
                    <div
                        className={`${gridClass} text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1`}
                        style={gridStyle}
                    >
                        <div title={localizeWithFallback('modtools.tickets.column.score.title', 'Priority score: lower is more urgent')}>
                            {localizeWithFallback('modtools.tickets.column.score', 'Score')}
                        </div>
                        <div>{localizeWithFallback('modtools.tickets.column.category', 'Category')}</div>
                        <div>{LocalizeText('modtools.tickets.column.type')}</div>
                        <div className="flex items-center gap-1">
                            <FaUser size={10} /> {LocalizeText('modtools.tickets.column.reported')}
                        </div>
                        <div className="flex items-center gap-1">
                            <FaClock size={10} /> {LocalizeText('modtools.tickets.column.opened')}
                        </div>
                        {showMessageCount && (
                            <div
                                className="flex items-center gap-1"
                                title={localizeWithFallback('modtools.tickets.column.msgs.title', 'Reports with a message')}
                            >
                                <FaCommentDots size={10} /> {localizeWithFallback('modtools.tickets.column.msgs', 'Msgs')}
                            </div>
                        )}
                        {showPicker && (
                            <div className="flex items-center gap-1">
                                <FaUserShield size={10} /> {LocalizeText('modtools.tickets.column.picker')}
                            </div>
                        )}
                        {renderActions && <div />}
                    </div>
                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center gap-1 py-8 opacity-50 text-sm">
                            <FaInbox size={22} />
                            <span>{emptyText}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col overflow-auto">
                            {rows.map((issue) => (
                                <div
                                    key={issue.issueId}
                                    className={`${gridClass} py-1.5 text-sm border-b border-zinc-100 even:bg-black/[0.02] transition-colors ${rowHoverClass}`}
                                    data-testid="issue-row"
                                    style={gridStyle}
                                >
                                    <span className="font-mono tabular-nums font-semibold">{issue.priority}</span>
                                    <span className="truncate" title={LocalizeText('help.cfh.topic.' + issue.reportedCategoryId)}>
                                        {LocalizeText('help.cfh.topic.' + issue.reportedCategoryId)}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border w-fit ${typeBadgeClass}`}>
                                        {GetIssueCategoryName(issue.categoryId)}
                                    </span>
                                    <span className="font-medium truncate inline-flex items-center gap-1">
                                        {issue.reportedUserId ? (
                                            <FaUser
                                                className="opacity-50 shrink-0"
                                                size={9}
                                                title={localizeWithFallback('modtools.tickets.target.user', 'Reported user')}
                                            />
                                        ) : (
                                            <FaDoorOpen
                                                className="opacity-50 shrink-0"
                                                size={9}
                                                title={localizeWithFallback('modtools.tickets.target.room', 'Reported room')}
                                            />
                                        )}
                                        <span className="truncate">{issue.reportedUserId ? issue.reportedUserName : ''}</span>
                                    </span>
                                    <span className="font-mono text-[.75rem] opacity-70 tabular-nums">
                                        {formatIssueOpenTime(getOpenMilliseconds ? getOpenMilliseconds(issue) : issue.issueAgeInMilliseconds)}
                                    </span>
                                    {showMessageCount && <span className="font-mono tabular-nums opacity-80">{countBundledMessages(allIssues, issue)}</span>}
                                    {showPicker && <span className="truncate font-medium opacity-80">{issue.pickerUserName}</span>}
                                    {renderActions && <div className="flex gap-1 justify-end">{renderActions(issue)}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
