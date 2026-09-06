import { CloseIssuesMessageComposer, ReleaseIssuesMessageComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { FaBan, FaCheck, FaCommentDots, FaExternalLinkAlt, FaSignOutAlt, FaTrashAlt } from 'react-icons/fa';
import { GetIssueCategoryName, LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useModTools } from '../../../../hooks';
import { CfhChatlogView } from './CfhChatlogView';

interface IssueInfoViewProps {
    issueId: number;
    onIssueInfoClosed(issueId: number): void;
}

const Field: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <>
        <dt className="opacity-60 whitespace-nowrap">{label}</dt>
        <dd className="m-0 break-words font-medium">{children || <span className="opacity-40">-</span>}</dd>
    </>
);

export const ModToolsIssueInfoView: FC<IssueInfoViewProps> = (props) => {
    const { issueId = null, onIssueInfoClosed = null } = props;
    const [cfhChatlogOpen, setCfhChatlogOpen] = useState(false);
    const { tickets = [], openUserInfo = null } = useModTools();
    const ticket = tickets.find((issue) => issue.issueId === issueId);

    const releaseIssue = () => {
        SendMessageComposer(new ReleaseIssuesMessageComposer([issueId]));
        onIssueInfoClosed(issueId);
    };

    const closeIssue = (resolutionType: number) => {
        SendMessageComposer(new CloseIssuesMessageComposer([issueId], resolutionType));
        onIssueInfoClosed(issueId);
    };

    if (!ticket) return null;

    return (
        <>
            <OctaneCardView
                className="octane-mod-tools-handle-issue min-w-0 w-[min(500px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                theme="primary-slim"
                windowPosition={DraggableWindowPosition.TOP_LEFT}
            >
                <OctaneCardHeaderView
                    headerText={LocalizeText('modtools.tickets.issue.title', ['issueId'], [issueId.toString()])}
                    onCloseClick={() => onIssueInfoClosed(issueId)}
                />
                <OctaneCardContentView className="text-black" gap={2}>
                    {/* Issue header */}
                    <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-transparent rounded p-2 border border-amber-100">
                        <FaCommentDots className="text-amber-600 shrink-0" size={16} />
                        <div className="flex flex-col grow min-w-0">
                            <div className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold">
                                {LocalizeText('modtools.tickets.issue.label', ['issueId'], [issueId.toString()])}
                            </div>
                            <div className="font-semibold leading-tight truncate">{GetIssueCategoryName(ticket.categoryId)}</div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-white border-amber-200 text-amber-800">
                            {LocalizeText('help.cfh.topic.' + ticket.reportedCategoryId)}
                        </span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold border-b border-zinc-200 pb-1 mb-0.5">
                            {LocalizeText('modtools.tickets.issue.details')}
                        </div>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[.8rem] m-0">
                            <Field label={LocalizeText('modtools.tickets.issue.field.source')}>{GetIssueCategoryName(ticket.categoryId)}</Field>
                            <Field label={LocalizeText('modtools.tickets.issue.field.category')}>
                                {LocalizeText('help.cfh.topic.' + ticket.reportedCategoryId)}
                            </Field>
                            <Field label={LocalizeText('modtools.tickets.issue.field.description')}>{ticket.message}</Field>
                            <Field label={LocalizeText('modtools.tickets.issue.field.caller')}>
                                <button
                                    className="font-semibold text-sky-700 hover:text-sky-900 hover:underline inline-flex items-center gap-1"
                                    onClick={() => openUserInfo(ticket.reporterUserId)}
                                >
                                    {ticket.reporterUserName} <FaExternalLinkAlt size={8} className="opacity-60" />
                                </button>
                            </Field>
                            <Field label={LocalizeText('modtools.tickets.issue.field.reported')}>
                                <button
                                    className="font-semibold text-sky-700 hover:text-sky-900 hover:underline inline-flex items-center gap-1"
                                    onClick={() => openUserInfo(ticket.reportedUserId)}
                                >
                                    {ticket.reportedUserName} <FaExternalLinkAlt size={8} className="opacity-60" />
                                </button>
                            </Field>
                        </dl>
                    </div>

                    {/* Tools */}
                    <Button gap={1} variant="secondary" onClick={() => setCfhChatlogOpen((prev) => !prev)}>
                        <FaCommentDots size={12} />{' '}
                        {cfhChatlogOpen ? LocalizeText('modtools.tickets.issue.chatlog.close') : LocalizeText('modtools.tickets.issue.chatlog.view')}
                    </Button>

                    {/* Resolution buttons */}
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-200">
                        <div className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold">
                            {LocalizeText('modtools.tickets.issue.resolve.heading')}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            <Button gap={1} variant="success" onClick={() => closeIssue(CloseIssuesMessageComposer.RESOLUTION_RESOLVED)}>
                                <FaCheck size={11} /> {LocalizeText('modtools.tickets.issue.resolve.resolved')}
                            </Button>
                            <Button gap={1} variant="dark" onClick={() => closeIssue(CloseIssuesMessageComposer.RESOLUTION_USELESS)}>
                                <FaTrashAlt size={11} /> {LocalizeText('modtools.tickets.issue.resolve.useless')}
                            </Button>
                            <Button gap={1} variant="danger" onClick={() => closeIssue(CloseIssuesMessageComposer.RESOLUTION_ABUSIVE)}>
                                <FaBan size={11} /> {LocalizeText('modtools.tickets.issue.resolve.abusive')}
                            </Button>
                        </div>
                        <Button gap={1} variant="secondary" onClick={releaseIssue}>
                            <FaSignOutAlt size={12} /> {LocalizeText('modtools.tickets.issue.release')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
            {cfhChatlogOpen && <CfhChatlogView issueId={issueId} onCloseClick={() => setCfhChatlogOpen(false)} />}
        </>
    );
};
