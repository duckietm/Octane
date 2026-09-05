import { GetGuestRoomResultEvent, NewConsoleMessageEvent, RoomInviteEvent, RoomSessionEvent } from '@octane/renderer';
import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { ChatEntryType, ChatHistoryCurrentDate, IChatEntry, IRoomHistoryEntry, MessengerHistoryCurrentDate } from '../../api';
import { useMessageEvent, useOctaneEvent } from '../events';
import { useLocalStorage } from '../useLocalStorage';

const ROOM_HISTORY_MAX = 10;
const CHAT_HISTORY_MAX = 1000;
const MESSENGER_HISTORY_MAX = 1000;

let CHAT_HISTORY_COUNTER: number = 0;
let MESSENGER_HISTORY_COUNTER: number = 0;

export const ClearStoredChatHistory = () => {
    CHAT_HISTORY_COUNTER = 0;
    MESSENGER_HISTORY_COUNTER = 0;

    try {
        window.localStorage.removeItem('chatHistory');
        window.localStorage.removeItem('roomHistory');
        window.localStorage.removeItem('messengerHistory');
        window.localStorage.removeItem('needsRoomInsert');
    } catch {}
};

/**
 * Project a list of chat entries to the slim shape we want to persist in
 * localStorage. `imageUrl` is a base64 data URL of the avatar / pet head
 * (10-50 KB each) - keeping it in storage blows past the browser quota
 * inside minutes in a pet-heavy room. The avatar can always be re-rendered
 * from `look` via ChatBubbleUtilities.getUserImage(), and pet images are
 * regenerated from the bubble flow when needed; we just don't restore
 * head thumbnails for entries loaded from a previous session.
 *
 * `style` / `chatType` / `color` are kept because they're tiny but
 * meaningful for re-rendering the bubble. Translation fields are kept
 * because they're already text.
 */
const slimChatEntriesForStorage = (entries: IChatEntry[]): IChatEntry[] => entries.map((entry) => (entry.imageUrl ? { ...entry, imageUrl: undefined } : entry));

const useChatHistoryState = () => {
    const [chatHistory, setChatHistory] = useLocalStorage<IChatEntry[]>('chatHistory', [], { toStorage: slimChatEntriesForStorage });
    const [roomHistory, setRoomHistory] = useLocalStorage<IRoomHistoryEntry[]>('roomHistory', []);
    const [messengerHistory, setMessengerHistory] = useLocalStorage<IChatEntry[]>('messengerHistory', [], { toStorage: slimChatEntriesForStorage });
    const [needsRoomInsert, setNeedsRoomInsert] = useLocalStorage('needsRoomInsert', false);

    const addChatEntry = (entry: IChatEntry) => {
        entry.id = CHAT_HISTORY_COUNTER++;

        setChatHistory((prevValue) => {
            const newValue = [...prevValue];

            newValue.push(entry);

            if (newValue.length > CHAT_HISTORY_MAX) newValue.shift();

            return newValue;
        });

        return entry.id;
    };

    const updateChatEntry = (entryId: number, partial: Partial<IChatEntry>) => {
        if (entryId < 0) return;

        setChatHistory((prevValue) => {
            const index = prevValue.findIndex((entry) => entry.id === entryId);

            if (index === -1) return prevValue;

            const newValue = [...prevValue];

            newValue[index] = { ...newValue[index], ...partial };

            return newValue;
        });
    };

    const clearChatHistory = () => setChatHistory([]);

    const addRoomHistoryEntry = (entry: IRoomHistoryEntry) => {
        setRoomHistory((prevValue) => {
            const newValue = [...prevValue];

            newValue.push(entry);

            if (newValue.length > ROOM_HISTORY_MAX) newValue.shift();

            return newValue;
        });
    };

    const addMessengerEntry = (entry: IChatEntry) => {
        entry.id = MESSENGER_HISTORY_COUNTER++;

        setMessengerHistory((prevValue) => {
            const newValue = [...prevValue];

            newValue.push(entry);

            if (newValue.length > MESSENGER_HISTORY_MAX) newValue.shift();

            return newValue;
        });
    };

    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.STARTED, (event) => setNeedsRoomInsert(true));

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        if (!needsRoomInsert) return;

        const parser = event.getParser();

        if (roomHistory.length) {
            if (roomHistory[roomHistory.length - 1].id === parser.data.roomId) return;
        }

        addChatEntry({
            id: -1,
            webId: -1,
            entityId: -1,
            name: parser.data.roomName,
            timestamp: ChatHistoryCurrentDate(),
            type: ChatEntryType.TYPE_ROOM_INFO,
            roomId: parser.data.roomId
        });

        addRoomHistoryEntry({ id: parser.data.roomId, name: parser.data.roomName });

        setNeedsRoomInsert(false);
    });

    useMessageEvent<NewConsoleMessageEvent>(NewConsoleMessageEvent, (event) => {
        const parser = event.getParser();

        addMessengerEntry({
            id: -1,
            webId: parser.senderId,
            entityId: -1,
            name: '',
            message: parser.messageText,
            roomId: -1,
            timestamp: MessengerHistoryCurrentDate(parser.secondsSinceSent),
            type: ChatEntryType.TYPE_IM
        });
    });

    useMessageEvent<RoomInviteEvent>(RoomInviteEvent, (event) => {
        const parser = event.getParser();

        addMessengerEntry({
            id: -1,
            webId: parser.senderId,
            entityId: -1,
            name: '',
            message: parser.messageText,
            roomId: -1,
            timestamp: MessengerHistoryCurrentDate(),
            type: ChatEntryType.TYPE_IM
        });
    });

    return { addChatEntry, updateChatEntry, clearChatHistory, chatHistory, roomHistory, messengerHistory };
};

export const useChatHistory = () => useSharedHook(useChatHistoryState);

registerSharedHook(useChatHistoryState);
