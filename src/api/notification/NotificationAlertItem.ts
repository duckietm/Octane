import { NotificationAlertType } from './NotificationAlertType';

export class NotificationAlertItem {
    private static ITEM_ID: number = -1;

    private _id: number;
    private _messages: string[];
    private _alertType: string;
    private _clickUrl: string;
    private _clickUrlText: string;
    private _title: string;
    private _imageUrl: string;
    private _timeoutSeconds: number;
    private _data: Map<string, string>;

    constructor(
        messages: string[],
        alertType: string = NotificationAlertType.DEFAULT,
        clickUrl: string = null,
        clickUrlText: string = null,
        title: string = null,
        imageUrl: string = null,
        timeoutSeconds: number = null,
        data: Map<string, string> = null
    ) {
        NotificationAlertItem.ITEM_ID += 1;

        this._id = NotificationAlertItem.ITEM_ID;
        this._messages = messages;
        this._alertType = alertType;
        this._clickUrl = clickUrl;
        this._clickUrlText = clickUrlText;
        this._title = title;
        this._imageUrl = imageUrl;
        this._timeoutSeconds = timeoutSeconds;
        this._data = data;
    }

    public get id(): number {
        return this._id;
    }

    public get messages(): string[] {
        return this._messages;
    }

    public set alertType(alertType: string) {
        this._alertType = alertType;
    }

    public get alertType(): string {
        return this._alertType;
    }

    public get clickUrl(): string {
        return this._clickUrl;
    }

    public get clickUrlText(): string {
        return this._clickUrlText;
    }

    /**
     * The placeholders the notification was sent with, for layouts that lay them
     * out themselves instead of reading the one rendered paragraph.
     */
    public get data(): Map<string, string> {
        return this._data;
    }

    /**
     * Seconds after which the alert closes itself, or null when it waits for the user.
     */
    public get timeoutSeconds(): number {
        return this._timeoutSeconds;
    }

    public get title(): string {
        return this._title;
    }

    public get imageUrl(): string {
        return this._imageUrl;
    }
}
