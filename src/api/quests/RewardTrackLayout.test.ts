import { describe, expect, it } from 'vitest';
import {
    buildRewardTrackLayout,
    buildRewardTrackPages,
    countRewardTrackUnclaimed,
    getRewardTrackBarWidths,
    getRewardTrackMiniBarWidth,
    getRewardTrackSlotLeft
} from './RewardTrackLayout';

const prize = (requiredPoints: number, premium = false, id = `${premium ? 'p' : 'f'}${requiredPoints}`) => ({ id, premium, requiredPoints });

describe('reward track layout (RewardTrackPrizeLayout)', () => {
    it('places the Introduction prizes (50 free, 200 premium) at 15px and 92px', () => {
        const layout = buildRewardTrackLayout([prize(50), prize(200, true)]);

        expect(layout.pageCount).toBe(1);
        expect(layout.pagePointSpan).toBe(1000);
        // The first prize sits half a prize plus the spacing in: 40 + 15.
        expect(layout.xFor(50, 0)).toBeCloseTo(55, 3);
        expect(getRewardTrackSlotLeft(layout.xFor(50, 0))).toBe(15);
        expect(getRewardTrackSlotLeft(layout.xFor(200, 0))).toBe(92);
        // 1000 points fit the 543px after the first offset, starting at 55 - 50 * d.
        expect(layout.distancePerPoint).toBeCloseTo(488 / 950, 4);
    });

    it('spreads prizes by their smallest gap and pages them', () => {
        const prizes = [10, 20, 30, 40, 50, 60, 70, 80].map((points) => prize(points));
        const layout = buildRewardTrackLayout(prizes);

        // gap 10 -> 9.5px a point, (598 - 55 - 0) / 9.5 / 10 = 5 prizes a page.
        expect(layout.pagePointSpan).toBe(50);
        expect(layout.pageCount).toBe(2);
        expect(layout.pageOf(50)).toBe(0);
        expect(layout.pageOf(51)).toBe(1);
        expect(layout.pageOf(0)).toBe(0);
        expect(layout.pageOf(10_000)).toBe(1);

        const pages = buildRewardTrackPages(prizes, layout);

        expect(pages.map((page) => page.free.map((p) => p.requiredPoints))).toEqual([
            [10, 20, 30, 40, 50],
            [60, 70, 80]
        ]);
        // On the second page 60 lands where 10 was on the first.
        expect(layout.xFor(60, 1)).toBeCloseTo(layout.xFor(10, 0), 6);
        // Every prize of a page stays inside the 598px prize layer.
        for (const value of [10, 50]) {
            const left = getRewardTrackSlotLeft(layout.xFor(value, 0));

            expect(left).toBeGreaterThanOrEqual(0);
            expect(left + 80).toBeLessThanOrEqual(598);
        }
    });

    it('keeps one indicator per points value and splits the tiers', () => {
        const prizes = [prize(20), prize(20, true), prize(60, true), prize(120)];
        const layout = buildRewardTrackLayout(prizes);
        const pages = buildRewardTrackPages(prizes, layout);
        const all = pages.flatMap((page) => page.points);

        expect(all).toEqual([20, 60, 120]);
        expect(pages.flatMap((page) => page.premium.map((p) => p.id))).toEqual(['p20', 'p60']);
        expect(pages.flatMap((page) => page.free.map((p) => p.id))).toEqual(['f20', 'f120']);
    });

    it('survives an empty track', () => {
        const layout = buildRewardTrackLayout([]);

        expect(layout.pageCount).toBe(1);
        expect(buildRewardTrackPages([], layout)).toEqual([{ free: [], premium: [], points: [] }]);
    });

    it('sizes the main bar like RewardTrackMainProgressBarView', () => {
        const layout = buildRewardTrackLayout([prize(50), prize(200, true)]);

        // 0 points still fills up to the zero offset (55 - 50 * d = 29.3px).
        expect(getRewardTrackBarWidths(layout.xFor(0, 0))).toEqual({ fill: 33, progress: 29 });
        expect(getRewardTrackBarWidths(layout.xFor(50, 0))).toEqual({ fill: 59, progress: 55 });
        expect(getRewardTrackBarWidths(-10)).toEqual({ fill: 4, progress: 0 });
        // Near and past the end the fill takes the whole 602px bar.
        expect(getRewardTrackBarWidths(599)).toEqual({ fill: 602, progress: 599 });
        expect(getRewardTrackBarWidths(5000)).toEqual({ fill: 602, progress: 602 });
    });

    it('counts the claimable prizes on the other pages for the page buttons', () => {
        const prizes = [10, 20, 30, 40, 50, 60, 70, 80].map((points) => prize(points));
        const layout = buildRewardTrackLayout(prizes);
        const claimable = (p: { requiredPoints: number }) => p.requiredPoints <= 70;

        expect(countRewardTrackUnclaimed(prizes, layout, 0, claimable)).toEqual({ next: 2, previous: 0 });
        expect(countRewardTrackUnclaimed(prizes, layout, 1, claimable)).toEqual({ next: 0, previous: 5 });
    });

    it('rounds the task and level bars', () => {
        expect(getRewardTrackMiniBarWidth(0.5, 200)).toBe(100);
        expect(getRewardTrackMiniBarWidth(1 / 3, 260)).toBe(87);
        expect(getRewardTrackMiniBarWidth(2, 200)).toBe(200);
        expect(getRewardTrackMiniBarWidth(-1, 200)).toBe(0);
    });
});
