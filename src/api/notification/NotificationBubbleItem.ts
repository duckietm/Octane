import { NotificationBubbleType } from './NotificationBubbleType';

/**
 * The extra data a bubble can carry, keyed as the official `NotificationExtraDataKey`
 * names them: `id` lets the server replace or retract a bubble later, `stay` keeps it
 * on screen until it is closed by hand, `time_display` overrides the fade delay in
 * milliseconds and `toggle_callback` adds a stop / resume button to the bubble.
 */
export interface NotificationBubbleExtras {
    id?: string;
    stay?: boolean;
    timeDisplayMs?: number;
    product?: unknown;
    rarity?: string;
    rarityColor?: string;
    toggleCallback?: (paused: boolean) => void;
    /** AIR 13 treasure hunt winner bubble: the head of the winner instead of an icon. */
    figure?: string;
    gender?: string;
}

export class NotificationBubbleItem {
    private static ITEM_ID: number = -1;

    private _id: number;
    private _message: string;
    private _notificationType: string;
    private _iconUrl: string;
    private _linkUrl: string;
    private _senderName: string;
    private _extras: NotificationBubbleExtras;

    constructor(
        message: string,
        notificationType: string = NotificationBubbleType.INFO,
        iconUrl: string = null,
        linkUrl: string = null,
        senderName: string = '',
        extras: NotificationBubbleExtras = null
    ) {
        NotificationBubbleItem.ITEM_ID += 1;

        this._id = NotificationBubbleItem.ITEM_ID;
        this._message = message;
        this._notificationType = notificationType;
        this._iconUrl = iconUrl;
        this._linkUrl = linkUrl;
        this._senderName = senderName;
        this._extras = extras || {};
    }

    public get id(): number {
        return this._id;
    }

    public get message(): string {
        return this._message;
    }

    public get notificationType(): string {
        return this._notificationType;
    }

    public get iconUrl(): string {
        return this._iconUrl;
    }

    public get linkUrl(): string {
        return this._linkUrl;
    }

    public get senderName(): string {
        return this._senderName;
    }

    public get extras(): NotificationBubbleExtras {
        return this._extras;
    }

    /** The server-side id of the bubble, when it sent one; null for the rest. */
    public get notificationId(): string {
        return this._extras.id || null;
    }

    /** A bubble marked `stay` does not fade on its own. */
    public get staysVisible(): boolean {
        return !!this._extras.stay;
    }

    /** The fade delay the bubble asked for, or null for the layout default. */
    public get timeDisplayMs(): number {
        const value = this._extras.timeDisplayMs;

        return Number.isFinite(value) && value > 0 ? value : null;
    }
}
