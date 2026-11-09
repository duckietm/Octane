import {
    CallForHelpCategoryData,
    CfhSanctionMessageEvent,
    CfhSanctionTypeData,
    CfhTopicsInitEvent,
    GetModeratorUserInfoMessageComposer,
    IssueDeletedMessageEvent,
    IssueInfoMessageEvent,
    IssueMessageData,
    ModeratorActionResultMessageEvent,
    ModeratorInitData,
    ModeratorInitMessageEvent
} from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { NotificationAlertType, SendMessageComposer, localizeWithFallback } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { showModAlert } from './modAlertStore';

export interface ModToolsSanctionEntry {
    label: string;
    at: number;
}

/**
 * Moderator state shared by the mod tools, the toolbar and housekeeping: the init data (permissions and message templates), the flat
 * issue list, the CFH topics, the sanction the server proposes per issue and what this moderator applied to whom this session. The
 * windows themselves are placed by `useModWindowTrackerStore` and the issues are bundled by `useIssueManagerStore`.
 */
const useModToolsState = () => {
    const [settings, setSettings] = useState<ModeratorInitData>(null);
    const [tickets, setTickets] = useState<IssueMessageData[]>([]);
    const [cfhCategories, setCfhCategories] = useState<CallForHelpCategoryData[]>([]);
    // What this moderator has already applied to whom, for as long as the client is open.
    // Two panels on the same person is the easy way to sanction twice for one thing.
    const [sanctionLog, setSanctionLog] = useState<Record<number, ModToolsSanctionEntry[]>>({});
    // The sanction the server proposes for an issue's topic; it arrives when the issue is picked.
    const [issueSanctions, setIssueSanctions] = useState<Record<number, CfhSanctionTypeData>>({});
    const { simpleAlert = null } = useNotification();

    useMessageEvent<ModeratorInitMessageEvent>(ModeratorInitMessageEvent, (event) => {
        const data = event.getParser().data;

        setSettings(data);
        setTickets(data.issues);
    });

    useMessageEvent<IssueInfoMessageEvent>(IssueInfoMessageEvent, (event) => {
        const issue = event.getParser().issueData;

        setTickets((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.findIndex((ticket) => ticket.issueId === issue.issueId);

            if (existingIndex >= 0) newValue[existingIndex] = issue;
            else newValue.push(issue);

            return newValue;
        });
    });

    useMessageEvent<IssueDeletedMessageEvent>(IssueDeletedMessageEvent, (event) => {
        const issueId = event.getParser().issueId;

        setTickets((prevValue) => prevValue.filter((ticket) => ticket.issueId !== issueId));
    });

    // AIR ModerationMessageHandler action result: a success asks for the user's info again (the open user info windows refresh) and
    // a failure raises the alert. The success notification is kept from the earlier mod tools.
    useMessageEvent<ModeratorActionResultMessageEvent>(ModeratorActionResultMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.success) {
            if (parser.userId > 0) SendMessageComposer(new GetModeratorUserInfoMessageComposer(parser.userId));

            simpleAlert?.(localizeWithFallback('octane.mod_tools.moderation_action_was_successful', 'Moderation action was successful'), NotificationAlertType.MODERATION, null, null, 'Success');
        } else showModAlert(localizeWithFallback('octane.mod_tools.moderation_action_failed_if_you_tried', 'Moderation action failed. If you tried to ban a user, please check if the user is already banned.'));
    });

    useMessageEvent<CfhTopicsInitEvent>(CfhTopicsInitEvent, (event) => {
        setCfhCategories(event.getParser().callForHelpCategories);
    });

    useMessageEvent<CfhSanctionMessageEvent>(CfhSanctionMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser?.sanctionType || parser.issueId <= 0) return;

        setIssueSanctions((prevValue) => ({ ...prevValue, [parser.issueId]: parser.sanctionType }));
    });

    const recordSanction = useCallback((userId: number, label: string) => {
        setSanctionLog((prev) => ({ ...prev, [userId]: [...(prev[userId] ?? []), { label, at: Date.now() }] }));
    }, []);

    return {
        settings,
        sanctionLog,
        recordSanction,
        cfhCategories,
        issueSanctions,
        tickets
    };
};

export const useModTools = () => useSharedHook(useModToolsState);

registerSharedHook(useModToolsState);
