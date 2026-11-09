/** What an opened calendar day holds, when the server says (Octane servers do; AIR's packet stops at the classname). */
export interface ICalendarRewardContents {
    readonly badgeCode?: string;
    readonly credits?: number;
    readonly pixels?: number;
    readonly points?: number;
    readonly pointsType?: number;
    readonly subscriptionType?: string;
    readonly subscriptionDays?: number;
}

export interface ICalendarItem extends ICalendarRewardContents {
    readonly productName: string;
    readonly customImage: string;
    readonly furnitureClassName: string;
}
