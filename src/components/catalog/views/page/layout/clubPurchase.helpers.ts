export interface ClubOfferLike {
    offerId: number;
    vip: boolean;
}

export interface ClubMembershipLike {
    clubDays: number;
    clubPeriods: number;
    isVip: boolean;
}

// The loyalty page sells the same club offers as the vip page, priced in the loyalty currency.
export const isVipPurchaseLayout = (layoutCode: string): boolean => layoutCode === 'vip_buy' || layoutCode === 'loyalty_vip_buy';

/** AIR's offer window per club page: club_buy 0, vip_buy 1, loyalty_vip_buy 6; any other page asks as club_buy. */
export const clubOffersWindowId = (layoutCode: string): number => {
    switch (layoutCode) {
        case 'vip_buy':
            return 1;
        case 'loyalty_vip_buy':
            return 6;
        default:
            return 0;
    }
};

export const groupClubOffers = <TOffer extends ClubOfferLike>(layoutCode: string, offers: readonly TOffer[]) => {
    const vip = offers.filter((offer) => offer.vip);
    const hc = isVipPurchaseLayout(layoutCode) ? [] : offers.filter((offer) => !offer.vip);

    return { hc, vip, visible: [...hc, ...vip] };
};

export const getClubMembershipSummary = (membership: ClubMembershipLike | null) => {
    if (!membership) return { active: false, tier: 'none' as const, totalDays: 0 };

    const totalDays = Math.max(0, membership.clubPeriods) * 31 + Math.max(0, membership.clubDays);

    if (!totalDays) return { active: false, tier: 'none' as const, totalDays: 0 };

    return {
        active: true,
        tier: membership.isVip ? ('vip' as const) : ('hc' as const),
        totalDays
    };
};
