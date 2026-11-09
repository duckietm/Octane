import { RoomWidgetUpdateEvent } from './RoomWidgetUpdateEvent';

export class RoomWidgetUpdateRentableBotTextSkillEvent extends RoomWidgetUpdateEvent {
    public static UPDATE_TEXT_SKILL: string = 'RWURBTSE_UPDATE_TEXT_SKILL';

    private _objectId: number;
    private _category: number;
    private _botId: number;
    private _skillType: number;
    private _text: string;

    constructor(objectId: number, category: number, botId: number, skillType: number, text: string) {
        super(RoomWidgetUpdateRentableBotTextSkillEvent.UPDATE_TEXT_SKILL);

        this._objectId = objectId;
        this._category = category;
        this._botId = botId;
        this._skillType = skillType;
        this._text = text;
    }

    public get objectId(): number {
        return this._objectId;
    }

    public get category(): number {
        return this._category;
    }

    public get botId(): number {
        return this._botId;
    }

    public get skillType(): number {
        return this._skillType;
    }

    public get text(): string {
        return this._text;
    }
}
