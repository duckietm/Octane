import { IWheelPrize } from '@octane/renderer';

// Group A is client-only: the player-facing prize payload (WheelDataEvent /
// IWheelPrize) carries no `weight`, so we can't read the server's real spin
// odds here. We approximate rarity from the data the client already has —
// the prize `type` and `amount`. A future cross-component change (Group B)
// can pass the true weight through and replace this heuristic.
//
//   none   → the "lose" slice. Quiet message, no celebration.
//   common → low-value wins (a free spin, a small credit/point payout).
//            Light reveal: prize card pops in, no confetti.
//   rare   → items, badges, or large currency payouts. Full celebration
//            overlay with confetti.
export type WheelPrizeTier = 'none' | 'common' | 'rare';

// Currency payouts at or above these amounts are treated as "rare". These are
// deliberately conservative defaults; tune per hotel if needed.
export const CREDITS_RARE_THRESHOLD = 500;
export const POINTS_RARE_THRESHOLD = 100;

export const getPrizeTier = (prize: IWheelPrize | null): WheelPrizeTier => {
    if (!prize) return 'common';

    switch (prize.type) {
        case 'nothing':
            return 'none';
        case 'item':
        case 'badge':
            return 'rare';
        case 'spin':
            return 'common';
        case 'credits':
            return prize.amount >= CREDITS_RARE_THRESHOLD ? 'rare' : 'common';
        case 'points':
            return prize.amount >= POINTS_RARE_THRESHOLD ? 'rare' : 'common';
        default:
            return 'common';
    }
};
