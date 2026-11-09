import { ICalendarItem, ICalendarRewardContents } from './ICalendarItem';

export class CalendarItem implements ICalendarItem {
    private _productName: string;
    private _customImage: string;
    private _furnitureClassName: string;
    private _contents: ICalendarRewardContents;

    constructor(productName: string, customImage: string, furnitureClassName: string, contents: ICalendarRewardContents = {}) {
        this._productName = productName;
        this._customImage = customImage;
        this._furnitureClassName = furnitureClassName;
        this._contents = contents;
    }

    public get productName(): string {
        return this._productName;
    }

    public get customImage(): string {
        return this._customImage;
    }

    public get furnitureClassName(): string {
        return this._furnitureClassName;
    }

    public get badgeCode(): string {
        return this._contents.badgeCode ?? '';
    }

    public get credits(): number {
        return this._contents.credits ?? 0;
    }

    public get pixels(): number {
        return this._contents.pixels ?? 0;
    }

    public get points(): number {
        return this._contents.points ?? 0;
    }

    public get pointsType(): number {
        return this._contents.pointsType ?? 0;
    }

    public get subscriptionType(): string {
        return this._contents.subscriptionType ?? '';
    }

    public get subscriptionDays(): number {
        return this._contents.subscriptionDays ?? 0;
    }
}
