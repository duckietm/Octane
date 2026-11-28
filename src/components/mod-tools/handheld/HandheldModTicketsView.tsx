import { FC, ReactNode, useState } from 'react';
import { localizeWithFallback } from '../../../api';
import roomIcon from '../../../assets/mod-tools/images/room_icon.png';
import userIcon from '../../../assets/mod-tools/images/user_icon.png';
import { BaseButton } from '../../../common/BaseButton';
import { Checkbox } from '../../../common/Checkbox';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { Select } from '../../../common/Select';
import { ToggleButton } from '../../../common/ToggleButton';
import { IssueTab } from '../../../hooks';
import { Evidence } from '../views/EvidenceChatlogList';
import { HandheldModChatlogList } from './HandheldModChatlogView';
import { HandheldModButton, HandheldModHeading, HandheldModNote, HandheldModPage, useHandheldModPageTitle } from './HandheldModPage';

export interface HandheldModIssueItem {
    id: number;
    priority: number;
    category: string;
    source: string;
    /** The reported user's name (empty for a room). */
    target: string;
    targetIsUser: boolean;
    time: string;
    messages: number;
    picker: string;
}

interface HandheldModIssueBrowserViewProps {
    title: string;
    tabs: { tab: IssueTab; label: string }[];
    tab: IssueTab;
    items: HandheldModIssueItem[];
    columns: { score: string; player: string; open: string; msgs: string; picker: string };
    /** Each button's caption; empty where the tab has no such button. */
    pickLabel: string;
    handleLabel: string;
    releaseLabel: string;
    releaseAllLabel: string;
    autoPickLabel: string;
    onTab: (tab: IssueTab) => void;
    onPick: (bundleId: number) => void;
    onHandle: (bundleId: number) => void;
    onRelease: (bundleId: number) => void;
    onReleaseAll: () => void;
    onPickNext: () => void;
    onClose: () => void;
}

/**
 * The ticket browser on a phone (IssueBrowserView's twin): Open / Mine / Picked as pills, each ticket a card with its
 * category, source, the reported player (or the room), how long it has been open and its score, and the row's own
 * buttons (pick; handle and release; nothing on picked). "Release all" and "Give me the next priority issue" sit in the
 * bar at the bottom. The lists, the order and the double-pick guard are IssueBrowserView's.
 */
export const HandheldModIssueBrowserView: FC<HandheldModIssueBrowserViewProps> = (props) => {
    const { title, tabs, tab, items, columns, pickLabel, handleLabel, releaseLabel, releaseAllLabel, autoPickLabel } = props;
    const { onTab, onPick, onHandle, onRelease, onReleaseAll, onPickNext, onClose } = props;

    return (
        <NativeTextTree>
            <HandheldModPage
                className="is-tickets"
                footer={
                    <>
                        {releaseAllLabel && (
                            <HandheldModButton disabled={!items.length} label={releaseAllLabel} testId="mod-tickets-release-all" onClick={onReleaseAll} />
                        )}
                        <HandheldModButton label={autoPickLabel} testId="mod-tickets-next" tone="primary" onClick={onPickNext} />
                    </>
                }
                title={title}
                onClose={onClose}
            >
                <div className="octane-handheld-modtools__segments" role="group">
                    {tabs.map((entry) => (
                        <ToggleButton
                            key={entry.tab}
                            className="octane-handheld-modtools__segment"
                            data-testid={`mod-tickets-tab-${entry.tab}`}
                            pressed={entry.tab === tab}
                            onPressedChange={() => onTab(entry.tab)}
                        >
                            {entry.label}
                        </ToggleButton>
                    ))}
                </div>
                {!items.length && <HandheldModNote text={localizeWithFallback('octane.handheld.mod_tools.no_tickets', 'No tickets here.')} />}
                <div className="octane-handheld-modtools__list">
                    {items.map((item) => (
                        <div key={item.id} className="octane-handheld-modtools__ticket" data-testid={`mod-ticket-${item.id}`}>
                            <div className="octane-handheld-modtools__ticket-main">
                                <img alt="" className="octane-handheld-modtools__ticket-icon" draggable={false} src={item.targetIsUser ? userIcon : roomIcon} />
                                <span className="octane-handheld-modtools__ticket-text">
                                    <span className="octane-handheld-modtools__ticket-title">{item.category}</span>
                                    <span className="octane-handheld-modtools__ticket-meta">
                                        <span className="octane-handheld-modtools__tag">{item.source}</span>
                                        {item.target && <span>{`${columns.player}: ${item.target}`}</span>}
                                    </span>
                                    <span className="octane-handheld-modtools__ticket-meta">
                                        <span>{`${columns.open} ${item.time}`}</span>
                                        <span>{`${columns.score} ${item.priority}`}</span>
                                        {tab === 'my' && <span>{`${columns.msgs} ${item.messages}`}</span>}
                                        {tab === 'picked' && <span>{`${columns.picker}: ${item.picker}`}</span>}
                                    </span>
                                </span>
                            </div>
                            {(pickLabel || handleLabel) && (
                                <div className="octane-handheld-modtools__ticket-actions">
                                    {pickLabel && (
                                        <HandheldModButton
                                            label={pickLabel}
                                            testId={`mod-ticket-pick-${item.id}`}
                                            tone="primary"
                                            onClick={() => onPick(item.id)}
                                        />
                                    )}
                                    {releaseLabel && (
                                        <HandheldModButton label={releaseLabel} testId={`mod-ticket-release-${item.id}`} onClick={() => onRelease(item.id)} />
                                    )}
                                    {handleLabel && (
                                        <HandheldModButton
                                            label={handleLabel}
                                            testId={`mod-ticket-handle-${item.id}`}
                                            tone="primary"
                                            onClick={() => onHandle(item.id)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </HandheldModPage>
        </NativeTextTree>
    );
};

export interface HandheldModIssueRow {
    id: number;
    reporter: string;
    category: string;
    source: string;
    time: string;
    /** The bundle's main issue (bold on the desktop when there are several). */
    primary: boolean;
    selected: boolean;
}

export interface HandheldModCloseAction {
    id: string;
    label: string;
    tone: 'primary' | 'danger' | 'plain';
    onClick: () => void;
}

type HandlerPart = 'ticket' | 'chatlog' | 'caller' | 'reported';

interface HandheldModIssueHandlerViewProps {
    title: string;
    /** What the ticket is called on its tab (its category and the reported user). */
    tabTitle: string;
    subtitle: string;
    issues: HandheldModIssueRow[];
    onSelectIssue: (issueId: number) => void;
    messages: string[];
    evidence: Evidence | null;
    callerPanel: ReactNode;
    reportedPanel: ReactNode | null;
    sectionLabels: { caller: string; messages: string; reported: string };
    topics: string[];
    topicIndex: number;
    topicDisabled: boolean;
    topicCaption: string;
    onTopic: (index: number) => void;
    proposedText: string;
    autoNext: boolean;
    autoNextLabel: string;
    onAutoNext: () => void;
    closeActions: HandheldModCloseAction[];
    onOpenUserInfo: (userId: number) => void;
    onOpenRoomTool: (roomId: number) => void;
    onEnterRoom: (roomId: number) => void;
    onClose: () => void;
}

/**
 * A ticket being handled, on a phone (IssueHandlerView's twin). Pills switch between the ticket (its issues, picking one
 * shows its evidence; the messages; the topic and the proposed sanction), the evidence chatlog, and the caller's and the
 * reported user's info. The closing actions (useless, abusive, release, default sanction, resolved) and "open the next
 * issue" stay in the bar at the bottom whatever is shown; IssueHandlerView sends them.
 */
export const HandheldModIssueHandlerView: FC<HandheldModIssueHandlerViewProps> = (props) => {
    const { title, tabTitle, subtitle, issues, onSelectIssue, messages, evidence, callerPanel, reportedPanel, sectionLabels } = props;
    const { topics, topicIndex, topicDisabled, topicCaption, onTopic, proposedText, autoNext, autoNextLabel, onAutoNext, closeActions } = props;
    const { onOpenUserInfo, onOpenRoomTool, onEnterRoom, onClose } = props;
    const [part, setPart] = useState<HandlerPart>('ticket');

    useHandheldModPageTitle(tabTitle);
    const parts: { id: HandlerPart; label: string }[] = [
        { id: 'ticket', label: localizeWithFallback('octane.handheld.mod_tools.ticket', 'Ticket') },
        { id: 'chatlog', label: localizeWithFallback('octane.mod_tools.chatlog', 'Chatlog') },
        { id: 'caller', label: localizeWithFallback('octane.handheld.mod_tools.caller', 'Caller') },
        ...(reportedPanel ? [{ id: 'reported' as const, label: localizeWithFallback('octane.handheld.mod_tools.reported', 'Reported') }] : [])
    ];
    const shown = part === 'reported' && !reportedPanel ? 'ticket' : part;

    return (
        <NativeTextTree>
            <HandheldModPage
                className="is-handler"
                footer={
                    <div className="octane-handheld-modtools__close-bar">
                        <label className="octane-handheld-modtools__check is-compact">
                            <Checkbox checked={autoNext} onCheckedChange={() => onAutoNext()} />
                            <span>{autoNextLabel}</span>
                        </label>
                        <div className="octane-handheld-modtools__close-actions">
                            {closeActions.map((action) => (
                                <HandheldModButton
                                    key={action.id}
                                    label={action.label}
                                    testId={`mod-handler-${action.id}`}
                                    tone={action.tone}
                                    onClick={action.onClick}
                                />
                            ))}
                        </div>
                    </div>
                }
                subtitle={subtitle}
                title={title}
                onClose={onClose}
            >
                <div className="octane-handheld-modtools__segments" role="group">
                    {parts.map((entry) => (
                        <ToggleButton
                            key={entry.id}
                            className="octane-handheld-modtools__segment"
                            data-testid={`mod-handler-part-${entry.id}`}
                            pressed={entry.id === shown}
                            onPressedChange={() => setPart(entry.id)}
                        >
                            {entry.label}
                        </ToggleButton>
                    ))}
                </div>
                {shown === 'ticket' && (
                    <>
                        <div className="octane-handheld-modtools__list">
                            {issues.map((issue) => (
                                <BaseButton
                                    key={issue.id}
                                    className="octane-handheld-modtools__issue"
                                    data-primary={issue.primary}
                                    data-selected={issue.selected}
                                    data-testid={`mod-issue-${issue.id}`}
                                    type="button"
                                    onClick={() => onSelectIssue(issue.id)}
                                >
                                    <span className="octane-handheld-modtools__ticket-text">
                                        <span className="octane-handheld-modtools__ticket-title">{issue.category}</span>
                                        <span className="octane-handheld-modtools__ticket-meta">
                                            <span className="octane-handheld-modtools__tag">{issue.source}</span>
                                            <span>{issue.reporter}</span>
                                            <span>{issue.time}</span>
                                        </span>
                                    </span>
                                </BaseButton>
                            ))}
                        </div>
                        <HandheldModHeading text={sectionLabels.messages} />
                        <div className="octane-handheld-modtools__card octane-handheld-modtools__messages">
                            {messages.map((message, index) => (
                                <p key={index} className="octane-handheld-modtools__message">
                                    {message}
                                </p>
                            ))}
                        </div>
                        <HandheldModHeading text={topicCaption} />
                        <Select
                            aria-label={topicCaption}
                            className="octane-handheld-modtools__select"
                            disabled={topicDisabled}
                            value={String(topicIndex)}
                            onChange={(event) => {
                                const index = Number(event.target.value);

                                if (index >= 0) onTopic(index);
                            }}
                        >
                            <option value="-1">{topicCaption}</option>
                            {topics.map((topic, index) => (
                                <option key={index} value={String(index)}>
                                    {topic}
                                </option>
                            ))}
                        </Select>
                        {proposedText && <p className="octane-handheld-modtools__proposed">{proposedText}</p>}
                    </>
                )}
                {shown === 'chatlog' && (
                    <HandheldModChatlogList evidence={evidence} onEnterRoom={onEnterRoom} onOpenRoomTool={onOpenRoomTool} onOpenUserInfo={onOpenUserInfo} />
                )}
                <div hidden={shown !== 'caller'}>
                    <HandheldModHeading text={sectionLabels.caller} />
                    {callerPanel}
                </div>
                {reportedPanel && (
                    <div hidden={shown !== 'reported'}>
                        <HandheldModHeading text={sectionLabels.reported} />
                        {reportedPanel}
                    </div>
                )}
            </HandheldModPage>
        </NativeTextTree>
    );
};
