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
