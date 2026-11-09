import { GetGroupChatData } from './GetGroupChatData';
import { MessengerFriend } from './MessengerFriend';
import { MessengerGroupType } from './MessengerGroupType';
import { MessengerThreadChat } from './MessengerThreadChat';
import { MessengerThreadChatGroup } from './MessengerThreadChatGroup';

export class MessengerThread {
    public static MESSAGE_RECEIVED: string = 'MT_MESSAGE_RECEIVED';
    public static THREAD_ID: number = 0;
    private static MAX_CHATS: number = 500;
    /** AIR MainView.shouldCombineWithPreviousEntry: messages combine into one block within 10 minutes. */
    public static COMBINE_WINDOW_MS: number = 600000;

    private _threadId: number;
    private _participant: MessengerFriend;
    private _groups: MessengerThreadChatGroup[];
    private _lastUpdated: Date;
    private _unreadCount: number;

    constructor(participant: MessengerFriend) {
        this._threadId = ++MessengerThread.THREAD_ID;
        this._participant = participant;
        this._groups = [];
        this._lastUpdated = new Date();
        this._unreadCount = 0;
    }

    /**
     * A copy to change in a state update: its own groups, lines and participant. A shallow copy shared the lists with
     * the previous state, so an update React runs twice (StrictMode, or a replayed render) added every line twice.
     */
    public clone(): MessengerThread {
        const copy: MessengerThread = Object.assign(Object.create(MessengerThread.prototype), this);

        copy._groups = this._groups.map((group) => group.clone());
        copy._participant = this._participant ? Object.assign(Object.create(Object.getPrototypeOf(this._participant)), this._participant) : this._participant;

        return copy;
    }

    public addMessage(
        senderId: number,
        message: string,
        secondsSinceSent: number = 0,
        extraData: string = null,
        type: number = 0,
        chatId: number = 0
    ): MessengerThreadChat {
        const chat = MessengerThread.appendChat(this._groups, senderId, message, secondsSinceSent, extraData, type, chatId);

        this.pruneChats();

        this._lastUpdated = new Date();

        // AIR MainView.recordChatEntry: only a chat line or a room invite lights the conversation; online / offline
        // lines and warnings do not.
        if (MessengerThread.countsAsUnread(type)) this._unreadCount++;

        return chat;
    }

    /**
     * AIR MainView loadMessageHistory: older messages go above the ones already shown. `messages` run oldest first,
     * and none of them lights the conversation.
     */
    public addHistoryMessages(messages: { senderId: number; message: string; secondsSinceSent: number; extraData: string; type: number }[]): void {
        if (!messages.length) return;

        const historyGroups: MessengerThreadChatGroup[] = [];

        for (const message of messages) {
            MessengerThread.appendChat(historyGroups, message.senderId, message.message, message.secondsSinceSent, message.extraData, message.type);
        }

        this._groups = [...historyGroups, ...this._groups];
        this.pruneChats();
    }

    public static countsAsUnread(type: number): boolean {
        return type !== MessengerThreadChat.STATUS_NOTIFICATION && type !== MessengerThreadChat.SECURITY_NOTIFICATION;
    }

    private static appendChat(
        groups: MessengerThreadChatGroup[],
        senderId: number,
        message: string,
        secondsSinceSent: number,
        extraData: string,
        type: number,
        chatId: number = 0
    ): MessengerThreadChat {
        const isGroupChat = senderId < 0 && extraData;
        const userId = isGroupChat ? GetGroupChatData(extraData).userId : senderId;
        const chat = new MessengerThreadChat(senderId, message, secondsSinceSent, extraData, type, chatId);
        const group = MessengerThread.groupFor(groups, userId, chat);

        if (isGroupChat) group.type = MessengerGroupType.GROUP_CHAT;

        group.addChat(chat);

        return chat;
    }

    /** The last block when the line is from the same sender within the combine window, otherwise a new block. */
    private static groupFor(groups: MessengerThreadChatGroup[], userId: number, chat: MessengerThreadChat): MessengerThreadChatGroup {
        const last = groups[groups.length - 1];
        const lastChat = last?.chats[last.chats.length - 1];

        if (last && last.userId === userId && (!lastChat || chat.date.getTime() < lastChat.date.getTime() + MessengerThread.COMBINE_WINDOW_MS)) return last;

        const group = new MessengerThreadChatGroup(userId);

        groups.push(group);

        return group;
    }

    public getChat(chatId: number): MessengerThreadChat {
        for (const group of this._groups) {
            const chat = group.chats.find((existingChat) => existingChat.id === chatId);

            if (chat) return chat;
        }

        return null;
    }

    private pruneChats(): void {
        let totalChats = this._groups.reduce((total, current) => total + current.chats.length, 0);

        while (totalChats > MessengerThread.MAX_CHATS) {
            const firstGroup = this._groups[0];

            if (!firstGroup) break;

            if (firstGroup.chats.length) firstGroup.chats.shift();

            if (!firstGroup.chats.length) {
                this._groups.shift();
            }

            totalChats--;
        }
    }

    /**
     * Marks the newest own chat line with this text as failed, as the server reports refused
     * messages by their text. Returns the marked line, or null when none matches.
     */
    public markOwnMessageFailed(senderId: number, message: string, failureText: string): MessengerThreadChat {
        const text = (message ?? '').trim();

        for (let groupIndex = this._groups.length - 1; groupIndex >= 0; groupIndex--) {
            const chats = this._groups[groupIndex].chats;

            for (let chatIndex = chats.length - 1; chatIndex >= 0; chatIndex--) {
                const chat = chats[chatIndex];

                if (chat.senderId !== senderId || chat.type !== MessengerThreadChat.CHAT || chat.failed) continue;
                if ((chat.message ?? '').trim() !== text) continue;

                chat.setFailed(failureText);

                return chat;
            }
        }

        return null;
    }

    public setRead(): void {
        this._unreadCount = 0;
    }

    public setMessagesReadFromUser(userId: number): void {
        for (const group of this._groups) {
            if (group.userId !== userId) continue;

            for (const chat of group.chats) chat.setStatus(MessengerThreadChat.READ);
        }
    }

    public get threadId(): number {
        return this._threadId;
    }

    public get participant(): MessengerFriend {
        return this._participant;
    }

    public get groups(): MessengerThreadChatGroup[] {
        return this._groups;
    }

    public get lastUpdated(): Date {
        return this._lastUpdated;
    }

    public get unreadCount(): number {
        return this._unreadCount;
    }

    public get unread(): boolean {
        return this._unreadCount > 0;
    }
}
