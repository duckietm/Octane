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

export const getPastClubDaysText = (pastClubDays: number, pastVipDays: number): ClubGiftText => daysText('catalog.club_gift.past_club', pastClubDays + pastVipDays);

export const getPastVipDaysText = (pastVipDays: number): ClubGiftText => daysText('catalog.club_gift.past_vip', pastVipDays);

export const getGiftRequirementText = (gift: ClubGiftRequirementLike, purse: ClubGiftPurseLike, giftsAvailable: number): ClubGiftText | null => {
    const pastDays = gift.isVip ? purse.pastVipDays : purse.pastClubDays + purse.pastVipDays;
    const missingDays = gift.daysRequired - pastDays;

    if (!gift.isSelectable && missingDays > 0) return daysText(gift.isVip ? 'catalog.club_gift.vip_missing' : 'catalog.club_gift.club_missing', missingDays);

    if (giftsAvailable > 0) return { key: 'catalog.club_gift.selectable', params: null };

    return null;
};
