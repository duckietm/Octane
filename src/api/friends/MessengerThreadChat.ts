export class MessengerThreadChat {
    public static CHAT: number = 0;
    public static ROOM_INVITE: number = 1;
    public static STATUS_NOTIFICATION: number = 2;
    public static SECURITY_NOTIFICATION: number = 3;
    public static SENT: number = 0;
    public static READ: number = 1;
    private static CHAT_ID: number = 0;

    private _id: number;
    private _type: number;
    private _status: number = MessengerThreadChat.SENT;
    private _senderId: number;
    private _message: string;
    private _secondsSinceSent: number;
    private _extraData: string;
    private _date: Date;
    private _showTranslation: boolean;
    private _originalMessage: string;
    private _translatedMessage: string;
    private _detectedLanguage: string;
    private _targetLanguage: string;
    private _failureText: string = null;

    constructor(senderId: number, message: string, secondsSinceSent: number = 0, extraData: string = null, type: number = 0) {
        this._id = ++MessengerThreadChat.CHAT_ID;
        this._type = type;
        this._senderId = senderId;
        this._message = message;
        this._secondsSinceSent = secondsSinceSent;
        this._extraData = extraData;
        this._date = new Date();
        this._showTranslation = false;
        this._originalMessage = message;
        this._translatedMessage = '';
        this._detectedLanguage = '';
        this._targetLanguage = '';
    }

    public setTranslation(originalMessage: string, translatedMessage: string, detectedLanguage: string, targetLanguage: string): void {
        this._showTranslation = true;
        this._originalMessage = originalMessage || this._message || '';
        this._translatedMessage = translatedMessage || this._originalMessage;
        this._detectedLanguage = detectedLanguage || '';
        this._targetLanguage = targetLanguage || '';
    }

    public get id(): number {
        return this._id;
    }

    public get type(): number {
        return this._type;
    }

    public get senderId(): number {
        return this._senderId;
    }

    public get message(): string {
        return this._message;
    }

    public get secondsSinceSent(): number {
        return this._secondsSinceSent;
    }

    public get extraData(): string {
        return this._extraData;
    }

    public get offlineDelivered(): boolean {
        return this._type === MessengerThreadChat.CHAT && this._extraData === 'offline';
    }

    public get status(): number {
        return this._status;
    }

    public setStatus(status: number): void {
        this._status = status;
    }

    /** The server refused the message; it never reached the friend. */
    public get failed(): boolean {
        return this._failureText !== null;
    }

    public get failureText(): string {
        return this._failureText;
    }

    public setFailed(failureText: string): void {
        this._failureText = failureText || '';
    }

    public get date(): Date {
        return this._date;
    }

    public get showTranslation(): boolean {
        return this._showTranslation;
    }

    public get originalMessage(): string {
        return this._originalMessage;
    }

    public get translatedMessage(): string {
        return this._translatedMessage;
    }

    public get detectedLanguage(): string {
        return this._detectedLanguage;
    }

    public get targetLanguage(): string {
        return this._targetLanguage;
    }
}
