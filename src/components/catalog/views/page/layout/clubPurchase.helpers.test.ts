import { describe, expect, it } from 'vitest';
import { getClubMembershipSummary, groupClubOffers, isVipPurchaseLayout } from './clubPurchase.helpers';

const offer = (offerId: number, vip: boolean) => ({ offerId, vip });

describe('club purchase rules', () => {
    it('shows only VIP offers on the VIP purchase page', () => {
        const groups = groupClubOffers('vip_buy', [offer(1, false), offer(2, true), offer(3, true)]);

        expect(groups.hc).toEqual([]);
        expect(groups.vip.map((entry) => entry.offerId)).toEqual([2, 3]);
        expect(groups.visible.map((entry) => entry.offerId)).toEqual([2, 3]);
    });

    it('treats the loyalty vip page like the VIP purchase page', () => {
        const groups = groupClubOffers('loyalty_vip_buy', [offer(1, false), offer(2, true)]);

        expect(groups.hc).toEqual([]);
        expect(groups.visible.map((entry) => entry.offerId)).toEqual([2]);
        expect(isVipPurchaseLayout('loyalty_vip_buy')).toBe(true);
        expect(isVipPurchaseLayout('vip_buy')).toBe(true);
        expect(isVipPurchaseLayout('club_buy')).toBe(false);
    });

    it('keeps HC and VIP offers separate on the club purchase page', () => {
        const groups = groupClubOffers('club_buy', [offer(1, false), offer(2, true), offer(3, false)]);

        expect(groups.hc.map((entry) => entry.offerId)).toEqual([1, 3]);
        expect(groups.vip.map((entry) => entry.offerId)).toEqual([2]);
        expect(groups.visible.map((entry) => entry.offerId)).toEqual([1, 3, 2]);
    });

    it('returns a safe inactive membership state before purse data is available', () => {
        expect(getClubMembershipSummary(null)).toEqual({ active: false, tier: 'none', totalDays: 0 });
    });

    it('distinguishes active HC and VIP memberships', () => {
        expect(getClubMembershipSummary({ clubDays: 2, clubPeriods: 1, isVip: false })).toEqual({
            active: true,
            tier: 'hc',
            totalDays: 33
        });
        expect(getClubMembershipSummary({ clubDays: 4, clubPeriods: 0, isVip: true })).toEqual({
            active: true,
            tier: 'vip',
            totalDays: 4
        });
    });
});
