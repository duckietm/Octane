import { afterEach, describe, expect, it } from 'vitest';
import { ducketsToClaim, exceedsDucketLimit, hasClaimableEarnings, useEarningsIndicatorStore } from './earningsIndicatorStore';

describe('AIR earnings unseen indicator', () => {
    afterEach(() => useEarningsIndicatorStore.setState({ showing: false }));

    it('lights from a first status that holds a claimable reward', () => {
        expect(hasClaimableEarnings([{ enabled: true, claimable: true, rewards: [{ amount: 5 }] }])).toBe(true);
        expect(hasClaimableEarnings([{ enabled: true, claimable: false, rewards: [{ amount: 5 }] }])).toBe(false);
        expect(hasClaimableEarnings([{ enabled: false, claimable: true, rewards: [{ amount: 5 }] }])).toBe(false);
        expect(hasClaimableEarnings([{ enabled: true, claimable: true, rewards: [{ amount: 0 }] }])).toBe(false);
        expect(hasClaimableEarnings([])).toBe(false);
    });

    it('switches on and off', () => {
        useEarningsIndicatorStore.getState().setShowing(true);
        expect(useEarningsIndicatorStore.getState().showing).toBe(true);
        useEarningsIndicatorStore.getState().setShowing(false);
        expect(useEarningsIndicatorStore.getState().showing).toBe(false);
    });
});

describe('AIR earnings ducket soft limit', () => {
    const entries = [
        { categoryKey: 'daily_gift', enabled: true, claimable: true, rewards: [{ type: 'pixels', amount: 50 }, { type: 'credits', amount: 10 }] },
        { categoryKey: 'games', enabled: true, claimable: true, rewards: [{ type: 'points', amount: 30, pointsType: 0 }, { type: 'points', amount: 5, pointsType: 5 }] },
        { categoryKey: 'hc_payday', enabled: true, claimable: false, rewards: [{ type: 'pixels', amount: 500 }] },
        { categoryKey: 'donations', enabled: false, claimable: true, rewards: [{ type: 'pixels', amount: 500 }] }
    ];

    it('counts the duckets of one category or of everything claimable', () => {
        expect(ducketsToClaim(entries, 'daily_gift')).toBe(50);
        expect(ducketsToClaim(entries, 'games')).toBe(30);
        expect(ducketsToClaim(entries, 'hc_payday')).toBe(0);
        expect(ducketsToClaim(entries)).toBe(80);
    });

    it('asks only when the claim takes the purse over a configured limit', () => {
        expect(exceedsDucketLimit(80, 950, 1000)).toBe(true);
        expect(exceedsDucketLimit(50, 950, 1000)).toBe(false);
        expect(exceedsDucketLimit(0, 5000, 1000)).toBe(false);
        expect(exceedsDucketLimit(80, 950, 0)).toBe(false);
    });
});
