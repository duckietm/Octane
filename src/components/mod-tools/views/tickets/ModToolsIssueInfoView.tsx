import { CloseIssueDefaultActionMessageComposer, CloseIssuesMessageComposer, ReleaseIssuesMessageComposer } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { FaBan, FaCheck, FaCommentDots, FaEnvelope, FaExternalLinkAlt, FaGavel, FaSignOutAlt, FaTrashAlt, FaUserShield } from 'react-icons/fa';
import { GetIssueCategoryName, ISelectedUser, LocalizeText, localizeWithFallback, NotificationAlertType, SendMessageComposer } from '../../../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useModTools, useNotification } from '../../../../hooks';
import {
    canCloseWithDefaultSanction,
    flattenCfhTopicIds,
    formatDefaultSanctionLabel,
    getInitialTopicId,
    REPORTED_CATEGORY_TOPIC_LOCKED,
    REPORTED_CATEGORY_TOPIC_REQUIRED
} from '../../common/ModToolsSanctionFormat';
import { ModToolsUserSendMessageView } from '../user/ModToolsUserSendMessageView';
import { CfhChatlogView } from './CfhChatlogView';

interface IssueInfoViewProps {
    issueId: number;
    onIssueInfoClosed(issueId: number): void;
    /** "Automatically open next issue": called after a close / release when the checkbox is ticked. */
    onHandleNext?(): void;
}

const Field: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <>
        <dt className="opacity-60 whitespace-nowrap">{label}</dt>
        <dd className="m-0 break-words font-medium">{children || <span className="opacity-40">-</span>}</dd>
    </>
);

/**
 * `issue_handler` (IssueHandler.as): the CFH topic dropdown with the default-sanction label
 * under it, close as useless / with the default sanction / as resolved, release, and the
 * "automatically open next issue" checkbox that chains into the auto-pick.
 */
export const ModToolsIssueInfoView: FC<IssueInfoViewProps> = (props) => {
    const { issueId = null, onIssueInfoClosed = null, onHandleNext = null } = props;
    const [cfhChatlogOpen, setCfhChatlogOpen] = useState(false);
    const [topicId, setTopicId] = useState(-1);
    const [handleNext, setHandleNext] = useState(true);
    const [messageTarget, setMessageTarget] = useState<ISelectedUser>(null);
    const { tickets = [], cfhCategories = null, settings = null, defaultSanctions = null, requestDefaultSanction = null, openUserInfo = null } = useModTools();
    const { simpleAlert = null } = useNotification();
    const ticket = tickets.find((issue) => issue.issueId === issueId);
    const topicIds = useMemo(() => flattenCfhTopicIds(cfhCategories), [cfhCategories]);
    const initializedRef = useRef(false);

    // IssueHandler: ask for the default sanction on open, preselect the topic and, for a
    // category-3 / topic-28 report, ask again for the fallback topic.
    useEffect(() => {
        if (!ticket || initializedRef.current) return;

        initializedRef.current = true;

        requestDefaultSanction?.(ticket.issueId, -1, -1);

        const initialTopic = getInitialTopicId(topicIds, ticket.categoryId, ticket.reportedCategoryId);

        setTopicId(initialTopic);

        if (ticket.categoryId === 3 && ticket.reportedCategoryId === REPORTED_CATEGORY_TOPIC_REQUIRED && initialTopic > 0) {
            requestDefaultSanction?.(ticket.issueId, -1, initialTopic);
        }
    }, [ticket, topicIds, requestDefaultSanction]);

    if (!ticket) return null;

    const topicLocked = ticket.reportedCategoryId === REPORTED_CATEGORY_TOPIC_LOCKED;
    const sanctionLabel = formatDefaultSanctionLabel(defaultSanctions?.byIssue?.[issueId] ?? null);
    const canMessage = !!settings?.alertPermission;

    const finish = () => {
        onIssueInfoClosed(issueId);

        // checkAutoHandling: the browser picks the next open issue for this moderator.
        if (handleNext) onHandleNext?.();
    };

    const changeTopic = (nextTopicId: number) => {
        setTopicId(nextTopicId);

        // refreshSanctionDataForSelectedTopic: the server answers with the sanction for that topic.
        if (nextTopicId > 0) requestDefaultSanction?.(issueId, -1, nextTopicId);
    };

    const releaseIssue = () => {
        SendMessageComposer(new ReleaseIssuesMessageComposer([issueId]));
        finish();
    };

    const closeIssue = (resolutionType: number) => {
        SendMessageComposer(new CloseIssuesMessageComposer([issueId], resolutionType));
        finish();
    };

    const closeWithDefaultSanction = () => {
        if (!canCloseWithDefaultSanction(topicId, ticket.reportedCategoryId)) {
            simpleAlert?.(
                localizeWithFallback('modtools.tickets.issue.sanction.topic_missing.body', 'You need to select the topic first.'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                localizeWithFallback('modtools.tickets.issue.sanction.topic_missing.title', 'Topic missing')
            );
            return;
        }

        // closeDefaultAction: the highest-priority issue first, the rest of its bundle after it.
        SendMessageComposer(new CloseIssueDefaultActionMessageComposer(issueId, [], topicId));
        finish();
    };

    const messageButton = (userId: number, username: string) => (
        <button
            className="ml-1 inline-flex items-center text-sky-700 hover:text-sky-900 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!canMessage || !userId}
            title={
                canMessage
                    ? localizeWithFallback('modtools.tickets.issue.message', 'Send a message')
                    : localizeWithFallback('modtools.userinfo.button.no_permission', 'You do not have the right to use this tool')
            }
            type="button"
            onClick={() => setMessageTarget({ userId, username })}
        >
            <FaEnvelope size={10} />
        </button>
    );

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
                                {messageButton(ticket.reporterUserId, ticket.reporterUserName)}
                            </Field>
                            <Field label={LocalizeText('modtools.tickets.issue.field.reported')}>
                                {ticket.reportedUserId > 0 && (
                                    <>
                                        <button
                                            className="font-semibold text-sky-700 hover:text-sky-900 hover:underline inline-flex items-center gap-1"
                                            onClick={() => openUserInfo(ticket.reportedUserId)}
                                        >
                                            {ticket.reportedUserName} <FaExternalLinkAlt size={8} className="opacity-60" />
                                        </button>
                                        {messageButton(ticket.reportedUserId, ticket.reportedUserName)}
                                    </>
                                )}
                            </Field>
                        </dl>
                    </div>

                    {/* CFH topic + default sanction (cfh_topics / sanction_label) */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[.7rem] uppercase tracking-wide opacity-60 font-semibold" htmlFor={`issue-topic-${issueId}`}>
                            {localizeWithFallback('modtools.tickets.issue.topic', 'CFH topic')}
                        </label>
                        <select
                            className="form-select form-select-sm"
                            disabled={topicLocked}
                            id={`issue-topic-${issueId}`}
                            value={topicId}
                            onChange={(event) => changeTopic(parseInt(event.target.value))}
                        >
                            <option disabled value={-1}>
                                {localizeWithFallback('modtools.tickets.issue.topic.placeholder', 'Select a topic')}
                            </option>
                            {topicIds.map((id) => (
                                <option key={id} value={id}>
                                    {LocalizeText('help.cfh.topic.' + id)}
                                </option>
                            ))}
                        </select>
                        <div className="flex items-center gap-1 text-[.8rem]" data-testid="issue-sanction-label">
                            <FaGavel className="opacity-60 shrink-0" size={10} />
                            <span className="opacity-60">{localizeWithFallback('modtools.tickets.issue.sanction.label', 'Default sanction')}:</span>
                            <span className="font-semibold truncate">{sanctionLabel || <span className="opacity-40">-</span>}</span>
                        </div>
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
                        <div className="grid grid-cols-2 gap-1.5">
                            <Button gap={1} variant="secondary" onClick={() => closeIssue(CloseIssuesMessageComposer.RESOLUTION_USELESS)}>
                                <FaTrashAlt size={11} /> {LocalizeText('modtools.tickets.issue.resolve.useless')}
                            </Button>
                            <Button gap={1} variant="danger" onClick={closeWithDefaultSanction}>
                                <FaBan size={11} /> {localizeWithFallback('modtools.tickets.issue.resolve.sanction', 'Default sanction')}
                            </Button>
                            <Button gap={1} variant="primary" onClick={() => closeIssue(CloseIssuesMessageComposer.RESOLUTION_RESOLVED)}>
                                <FaCheck size={11} /> {LocalizeText('modtools.tickets.issue.resolve.resolved')}
                            </Button>
                            <Button gap={1} variant="secondary" onClick={releaseIssue}>
                                <FaSignOutAlt size={12} /> {LocalizeText('modtools.tickets.issue.release')}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <label className="inline-flex items-center gap-1.5 text-[.8rem] cursor-pointer">
                                <input checked={handleNext} type="checkbox" onChange={(event) => setHandleNext(event.target.checked)} />
                                {localizeWithFallback('modtools.tickets.issue.handle_next', 'Automatically open next issue')}
                            </label>
                            {/* move_to_player_support: the official handler disables it on open */}
                            <Button
                                disabled
                                gap={1}
                                title={localizeWithFallback('modtools.tickets.issue.player_support.unavailable', 'Not available on this hotel')}
                                variant="secondary"
                            >
                                <FaUserShield size={11} /> {localizeWithFallback('modtools.tickets.issue.player_support', 'Move to player support')}
                            </Button>
                        </div>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
            {cfhChatlogOpen && <CfhChatlogView issueId={issueId} onCloseClick={() => setCfhChatlogOpen(false)} />}
            {messageTarget && <ModToolsUserSendMessageView issueId={issueId} user={messageTarget} onCloseClick={() => setMessageTarget(null)} />}
        </>
    );
};
