import {
    CallForHelpCategoryData,
    CfhSanctionMessageEvent,
    CfhTopicsInitEvent,
    IssueDeletedMessageEvent,
    IssueInfoMessageEvent,
    IssueMessageData,
    IssuePickFailedMessageEvent,
    ModeratorActionResultMessageEvent,
    ModeratorInitData,
    ModeratorInitMessageEvent,
    ModeratorToolPreferencesEvent,
    ModToolSanctionComposer
} from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { NotificationAlertType, PlaySound, SendMessageComposer, SoundNames } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

export interface ModToolsSanctionEntry {
    label: string;
    at: number;
}

/** What the server answers a sanction-data request with (`CfhSanctionTypeData`), kept as plain data. */
export interface ModToolsDefaultSanction {
    name: string;
    sanctionLengthInHours: number;
    avatarOnly: boolean;
    tradeLockInfo: string;
    machineBanInfo: string;
}

/**
 * `IssueManager.updateSanctionData` routes an answer by issue id when it carries one (the issue
 * handler's label) and by account id otherwise (the mod action window's label).
 */
export interface ModToolsDefaultSanctions {
    byIssue: Record<number, ModToolsDefaultSanction>;
    byAccount: Record<number, ModToolsDefaultSanction>;
}

const useModToolsState = () => {
    const [settings, setSettings] = useState<ModeratorInitData>(null);
    const [openRooms, setOpenRooms] = useState<number[]>([]);
    const [openRoomChatlogs, setOpenRoomChatlogs] = useState<number[]>([]);
    const [openUserInfos, setOpenUserInfos] = useState<number[]>([]);
    const [openUserChatlogs, setOpenUserChatlogs] = useState<number[]>([]);
    const [tickets, setTickets] = useState<IssueMessageData[]>([]);
    const [cfhCategories, setCfhCategories] = useState<CallForHelpCategoryData[]>([]);
    // What this moderator has already applied to whom, for as long as the client is open.
    // Two panels on the same person is the easy way to sanction twice for one thing.
    const [sanctionLog, setSanctionLog] = useState<Record<number, ModToolsSanctionEntry[]>>({});
    const [defaultSanctions, setDefaultSanctions] = useState<ModToolsDefaultSanctions>({ byIssue: {}, byAccount: {} });
    const { simpleAlert = null } = useNotification();

    const openRoomInfo = (roomId: number) => {
        if (openRooms.indexOf(roomId) >= 0) return;

        setOpenRooms((prevValue) => [...prevValue, roomId]);
    };

    const closeRoomInfo = (roomId: number) => {
        setOpenRooms((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.indexOf(roomId);

            if (existingIndex >= 0) newValue.splice(existingIndex, 1);

            return newValue;
        });
    };

    const toggleRoomInfo = (roomId: number) => {
        if (openRooms.indexOf(roomId) >= 0) closeRoomInfo(roomId);
        else openRoomInfo(roomId);
    };

    const openRoomChatlog = (roomId: number) => {
        if (openRoomChatlogs.indexOf(roomId) >= 0) return;

        setOpenRoomChatlogs((prevValue) => [...prevValue, roomId]);
    };

    const closeRoomChatlog = (roomId: number) => {
        setOpenRoomChatlogs((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.indexOf(roomId);

            if (existingIndex >= 0) newValue.splice(existingIndex, 1);

            return newValue;
        });
    };

    const toggleRoomChatlog = (roomId: number) => {
        if (openRoomChatlogs.indexOf(roomId) >= 0) closeRoomChatlog(roomId);
        else openRoomChatlog(roomId);
    };

    const openUserInfo = (userId: number) => {
        if (openUserInfos.indexOf(userId) >= 0) return;

        setOpenUserInfos((prevValue) => [...prevValue, userId]);
    };

    const closeUserInfo = (userId: number) => {
        setOpenUserInfos((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.indexOf(userId);

            if (existingIndex >= 0) newValue.splice(existingIndex, 1);

            return newValue;
        });
    };

    const toggleUserInfo = (userId: number) => {
        if (openUserInfos.indexOf(userId) >= 0) closeUserInfo(userId);
        else openUserInfo(userId);
    };

    const openUserChatlog = (userId: number) => {
        if (openUserChatlogs.indexOf(userId) >= 0) return;

        setOpenUserChatlogs((prevValue) => [...prevValue, userId]);
    };

    const closeUserChatlog = (userId: number) => {
        setOpenUserChatlogs((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.indexOf(userId);

            if (existingIndex >= 0) newValue.splice(existingIndex, 1);

            return newValue;
        });
    };

    const toggleUserChatlog = (userId: number) => {
        if (openUserChatlogs.indexOf(userId) >= 0) closeUserChatlog(userId);
        else openUserChatlog(userId);
    };

    useMessageEvent<ModeratorInitMessageEvent>(ModeratorInitMessageEvent, (event) => {
        const parser = event.getParser();
        const data = parser.data;

        setSettings(data);
        setTickets(data.issues);
    });

    useMessageEvent<IssueInfoMessageEvent>(IssueInfoMessageEvent, (event) => {
        const parser = event.getParser();

        setTickets((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.findIndex((ticket) => ticket.issueId === parser.issueData.issueId);

            if (existingIndex >= 0) newValue[existingIndex] = parser.issueData;
            else {
                newValue.push(parser.issueData);

                PlaySound(SoundNames.MODTOOLS_NEW_TICKET);
            }

            return newValue;
        });
    });

    useMessageEvent<ModeratorToolPreferencesEvent>(ModeratorToolPreferencesEvent, (event) => {
        const parser = event.getParser();
    });

    useMessageEvent<IssuePickFailedMessageEvent>(IssuePickFailedMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        simpleAlert('Failed to pick issue', NotificationAlertType.DEFAULT, null, null, 'Error');
    });

    useMessageEvent<IssueDeletedMessageEvent>(IssueDeletedMessageEvent, (event) => {
        const parser = event.getParser();

        setTickets((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.findIndex((ticket) => ticket.issueId === parser.issueId);

            if (existingIndex >= 0) newValue.splice(existingIndex, 1);

            return newValue;
        });
    });

    useMessageEvent<ModeratorActionResultMessageEvent>(ModeratorActionResultMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.success) simpleAlert('Moderation action was successful', NotificationAlertType.MODERATION, null, null, 'Success');
        else simpleAlert('There was a problem applying the moderation action', NotificationAlertType.MODERATION, null, null, 'Error');
    });

    useMessageEvent<CfhTopicsInitEvent>(CfhTopicsInitEvent, (event) => {
        const parser = event.getParser();

        setCfhCategories(parser.callForHelpCategories);
    });

    useMessageEvent<CfhSanctionMessageEvent>(CfhSanctionMessageEvent, (event) => {
        const parser = event.getParser();
        const sanctionType = parser?.sanctionType;

        if (!sanctionType) return;

        const sanction: ModToolsDefaultSanction = {
            name: sanctionType.name ?? '',
            sanctionLengthInHours: sanctionType.sanctionLengthInHours ?? 0,
            avatarOnly: !!sanctionType.avatarOnly,
            tradeLockInfo: sanctionType.tradeLockInfo ?? '',
            machineBanInfo: sanctionType.machineBanInfo ?? ''
        };

        setDefaultSanctions((prev) =>
            parser.issueId > 0
                ? { ...prev, byIssue: { ...prev.byIssue, [parser.issueId]: sanction } }
                : { ...prev, byAccount: { ...prev.byAccount, [parser.accountId]: sanction } }
        );
    });

    /**
     * `IssueManager.requestSanctionData` / `requestSanctionDataForAccount`: ask what the default
     * sanction for the topic would be, for an issue (account -1) or for an account (issue -1).
     */
    const requestDefaultSanction = useCallback((issueId: number, accountId: number, topicId: number) => {
        SendMessageComposer(new ModToolSanctionComposer(issueId, accountId, topicId));
    }, []);

    const recordSanction = useCallback((userId: number, label: string) => {
        setSanctionLog((prev) => ({ ...prev, [userId]: [...(prev[userId] ?? []), { label, at: Date.now() }] }));
    }, []);

    return {
        settings,
        sanctionLog,
        recordSanction,
        defaultSanctions,
        requestDefaultSanction,
        openRooms,
        openRoomChatlogs,
        openUserChatlogs,
        openUserInfos,
        cfhCategories,
        tickets,
        openRoomInfo,
        closeRoomInfo,
        toggleRoomInfo,
        openRoomChatlog,
        closeRoomChatlog,
        toggleRoomChatlog,
        openUserInfo,
        closeUserInfo,
        toggleUserInfo,
        openUserChatlog,
        closeUserChatlog,
        toggleUserChatlog
    };
};

export const useModTools = () => useSharedHook(useModToolsState);

registerSharedHook(useModToolsState);
