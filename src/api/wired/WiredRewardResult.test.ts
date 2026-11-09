import { describe, expect, it } from 'vitest';
import { wiredRewardResultAlert } from './WiredRewardResult';

describe('wiredRewardResultAlert', () => {
    it('shows the reward success texts for a product', () => {
        expect(wiredRewardResultAlert(6)).toEqual({ titleKey: 'wiredfurni.rewardsuccess.title', bodyKey: 'wiredfurni.rewardsuccess.body' });
    });

    it('shows the badge received texts for a badge', () => {
        expect(wiredRewardResultAlert(7)).toEqual({ titleKey: 'wiredfurni.badgereceived.title', bodyKey: 'wiredfurni.badgereceived.body' });
    });

    it('shows the failure reason for every other reason, including ones outside 0-5 and 8', () => {
        for (const reason of [0, 1, 5, 8, 9, 12, -1]) {
            expect(wiredRewardResultAlert(reason)).toEqual({ titleKey: 'wiredfurni.rewardfailed.title', bodyKey: `wiredfurni.rewardfailed.reason.${reason}` });
        }
    });
});
