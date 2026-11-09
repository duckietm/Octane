import { MessengerGroupType } from './MessengerGroupType';
import { MessengerThreadChat } from './MessengerThreadChat';

export class MessengerThreadChatGroup {
    private _userId: number;
    private _chats: MessengerThreadChat[];
    private _type: number;

    constructor(userId: number, type = MessengerGroupType.PRIVATE_CHAT) {
        this._userId = userId;
        this._chats = [];
        this._type = type;
    }

    /** A copy with its own list of copied lines. */
    public clone(): MessengerThreadChatGroup {
        const copy = new MessengerThreadChatGroup(this._userId, this._type);

        copy._chats = this._chats.map((chat) => chat.clone());

        return copy;
    }

    public addChat(message: MessengerThreadChat): void {
        this._chats.push(message);
    }

    public get userId(): number {
        return this._userId;
    }

    public get chats(): MessengerThreadChat[] {
        return this._chats;
    }

    public get type(): number {
        return this._type;
    }

    public set type(type: number) {
        this._type = type;
    }
}
