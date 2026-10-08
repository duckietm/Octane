import { GetGroupChatData } from './GetGroupChatData';
import { MessengerFriend } from './MessengerFriend';
import { MessengerGroupType } from './MessengerGroupType';
import { MessengerThreadChat } from './MessengerThreadChat';
import { MessengerThreadChatGroup } from './MessengerThreadChatGroup';

export class MessengerThread {
    public static MESSAGE_RECEIVED: string = 'MT_MESSAGE_RECEIVED';
    public static THREAD_ID: number = 0;
    private static MAX_CHATS: number = 500;

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

    public addMessage(senderId: number, message: string, secondsSinceSent: number = 0, extraData: string = null, type: number = 0): MessengerThreadChat {
        const isGroupChat = senderId < 0 && extraData;
        const userId = isGroupChat ? GetGroupChatData(extraData).userId : senderId;

        const group = this.getLastGroup(userId);

        if (!group) return;

        if (isGroupChat) group.type = MessengerGroupType.GROUP_CHAT;

        const chat = new MessengerThreadChat(senderId, message, secondsSinceSent, extraData, type);

        group.addChat(chat);
        this.pruneChats();

        this._lastUpdated = new Date();

        this._unreadCount++;

        return chat;
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

    private getLastGroup(userId: number): MessengerThreadChatGroup {
        let group = this._groups[this._groups.length - 1];

        if (group && group.userId === userId) return group;

        group = new MessengerThreadChatGroup(userId);

        this._groups.push(group);

        return group;
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
