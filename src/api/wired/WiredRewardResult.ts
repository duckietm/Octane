/** Official reward result reasons (WiredRewardResultMessageEvent): 6 a product, 7 a badge, anything else a refusal. */
export const WIRED_REWARD_PRODUCT_DONATED = 6;
export const WIRED_REWARD_BADGE_DONATED = 7;

/** The texts of the alert a reward result shows. */
export interface WiredRewardResultAlert {
    titleKey: string;
    bodyKey: string;
}

/**
 * The official reward result handling: a product shows `wiredfurni.rewardsuccess.*`, a badge
 * `wiredfurni.badgereceived.*`, and every other reason `wiredfurni.rewardfailed.reason.<reason>`
 * under `wiredfurni.rewardfailed.title`, whatever the reason is.
 */
export const wiredRewardResultAlert = (reason: number): WiredRewardResultAlert => {
    switch (reason) {
        case WIRED_REWARD_PRODUCT_DONATED:
            return { titleKey: 'wiredfurni.rewardsuccess.title', bodyKey: 'wiredfurni.rewardsuccess.body' };
        case WIRED_REWARD_BADGE_DONATED:
            return { titleKey: 'wiredfurni.badgereceived.title', bodyKey: 'wiredfurni.badgereceived.body' };
        default:
            return { titleKey: 'wiredfurni.rewardfailed.title', bodyKey: `wiredfurni.rewardfailed.reason.${reason}` };
    }
};
