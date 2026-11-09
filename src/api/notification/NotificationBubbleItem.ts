import type { CollectibleProductData } from '@octane/renderer';
import { NotificationBubbleType } from './NotificationBubbleType';

/**
 * The extra data of an `nft_opening` bubble (AIR `CollectiblesController` passes the reward, its rarity and
 * the rarity colour): the bubble shows the reward's icon and "Rarity: <rarity>" in that colour.
 */
export interface NotificationCollectibleReward {
    product: CollectibleProductData;
    rarity: string;
    rarityColor: number;
}

export class NotificationBubbleItem {
    private static ITEM_ID: number = -1;

    private _id: number;
    private _message: string;
    private _notificationType: string;
    private _iconUrl: string;
    private _linkUrl: string;
    private _senderName: string;
    private _collectible: NotificationCollectibleReward;

    constructor(
        message: string,
        notificationType: string = NotificationBubbleType.INFO,
        iconUrl: string = null,
        linkUrl: string = null,
        senderName: string = '',
        collectible: NotificationCollectibleReward = null
    ) {
        NotificationBubbleItem.ITEM_ID += 1;

        this._id = NotificationBubbleItem.ITEM_ID;
        this._message = message;
        this._notificationType = notificationType;
        this._iconUrl = iconUrl;
        this._linkUrl = linkUrl;
        this._senderName = senderName;
        this._collectible = collectible;
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

    public get collectible(): NotificationCollectibleReward {
        return this._collectible;
    }
}
