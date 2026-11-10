import { createOctaneStore } from './createOctaneStore';

/**
 * AIR `EarningsController.showingIndicator`: the purse's `earnings_unseen_indicator` on the earnings button. It lights
 * when a new reward arrives (IncomeRewardNotification while the earnings window is closed) or when the first status
 * of the session already holds a claimable reward, and goes out when the earnings window opens.
 */
interface EarningsIndicatorState {
    showing: boolean;
    setShowing: (showing: boolean) => void;
}

export const useEarningsIndicatorStore = createOctaneStore<EarningsIndicatorState>()((set) => ({
    showing: false,
    setShowing: (showing: boolean) => set((state) => (state.showing === showing ? state : { showing }))
}));

/** AIR `EarningsController.onIncomeRewardStatus` (first status only): any reward waiting to be claimed. */
export const hasClaimableEarnings = (entries: ReadonlyArray<{ enabled: boolean; claimable: boolean; rewards?: ReadonlyArray<{ amount: number }> }>): boolean =>
    entries.some((entry) => entry.enabled && entry.claimable && (entry.rewards ?? []).some((reward) => reward.amount > 0));

interface DucketEntry {
    categoryKey: string;
    enabled: boolean;
    claimable: boolean;
    rewards?: ReadonlyArray<{ type: string; amount: number; pointsType?: number }>;
}

/**
 * AIR EarningsView.ducketValueForCategory: the duckets a claim would pay out, for one category or (no key) for every
 * claimable one. Duckets are the `pixels` reward, or `points` of type 0.
 */
export const ducketsToClaim = (entries: ReadonlyArray<DucketEntry>, categoryKey: string = null): number =>
    entries
        .filter((entry) => entry.enabled && entry.claimable && (categoryKey === null || entry.categoryKey === categoryKey))
        .flatMap((entry) => entry.rewards ?? [])
        .filter((reward) => reward.type === 'pixels' || (reward.type === 'points' && reward.pointsType === 0))
        .reduce((total, reward) => total + Math.max(0, reward.amount || 0), 0);

/**
 * AIR EarningsView: a claim that takes the duckets over `duckets.soft_limit` loses the surplus, so it asks first. No
 * limit configured (0 or less) never asks.
 */
export const exceedsDucketLimit = (claiming: number, current: number, softLimit: number): boolean =>
    softLimit > 0 && claiming > 0 && claiming + Math.max(0, current || 0) > softLimit;
