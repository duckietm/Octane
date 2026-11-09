import { afterEach, describe, expect, it } from 'vitest';
import { hasClaimableEarnings, useEarningsIndicatorStore } from './earningsIndicatorStore';

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
