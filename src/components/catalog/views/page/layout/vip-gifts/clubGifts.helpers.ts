const DAYS_PER_MONTH = 31;

export interface ClubGiftDaysParams {
    days: number;
    months: number;
}

export interface ClubGiftText {
    key: string;
    params: ClubGiftDaysParams | null;
}

export interface ClubGiftRequirementLike {
    isVip: boolean;
    isSelectable: boolean;
    daysRequired: number;
}

export interface ClubGiftPurseLike {
    pastClubDays: number;
    pastVipDays: number;
}

const splitDays = (totalDays: number): ClubGiftDaysParams => {
    const days = Math.max(0, totalDays);

    return { days: days % DAYS_PER_MONTH, months: Math.floor(days / DAYS_PER_MONTH) };
};

// Texts come in a short form (days only) and a long form (months and days) used from a full month.
const daysText = (baseKey: string, totalDays: number): ClubGiftText => ({
    key: totalDays >= DAYS_PER_MONTH ? `${baseKey}.long` : baseKey,
    params: splitDays(totalDays)
});

export const getPastClubDaysText = (pastClubDays: number, pastVipDays: number): ClubGiftText =>
    daysText('catalog.club_gift.past_club', pastClubDays + pastVipDays);

export const getPastVipDaysText = (pastVipDays: number): ClubGiftText => daysText('catalog.club_gift.past_vip', pastVipDays);

export const getGiftRequirementText = (gift: ClubGiftRequirementLike, purse: ClubGiftPurseLike, giftsAvailable: number): ClubGiftText | null => {
    const pastDays = gift.isVip ? purse.pastVipDays : purse.pastClubDays + purse.pastVipDays;
    const missingDays = gift.daysRequired - pastDays;

    if (!gift.isSelectable && missingDays > 0) return daysText(gift.isVip ? 'catalog.club_gift.vip_missing' : 'catalog.club_gift.club_missing', missingDays);

    if (giftsAvailable > 0) return { key: 'catalog.club_gift.selectable', params: null };

    return null;
};

type GiftFurniData = { name?: string; description?: string; className?: string } | null | undefined;

/** A furnidata text that is only an unresolved localization key (`hc19_1.desc`, `roomItem.name.10`). */
const isRawKey = (text: string, className: string): boolean =>
    /^\S+\.(name|desc)$/.test(text) || /^(roomItem|wallItem)\.(name|desc)\.\d+$/.test(text) || (!!className && text.startsWith(`${className}.`));

/**
 * AIR ClubGiftWidget names a gift from its product data (furnidata name / description). A text that is only a
 * key is looked up once (`localize`), and shown as nothing when that does not resolve either; a missing name
 * falls back to the class name.
 */
export const getClubGiftFurniText = (furniData: GiftFurniData, field: 'name' | 'desc', localize: (key: string) => string): string => {
    const className = furniData?.className ?? '';
    const text = ((field === 'name' ? furniData?.name : furniData?.description) ?? '').trim();

    if (text && !isRawKey(text, className)) return text;

    if (text) {
        const localized = localize(text);

        if (localized && localized !== text) return localized;
    }

    return field === 'name' ? className : '';
};
