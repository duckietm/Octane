import { describe, expect, it } from 'vitest';
import { buildRewardTrackMilestones, getRewardTrackNextStop, getRewardTrackRowFill } from './RewardTrackMilestones';

const prize = (id: string, requiredPoints: number, premium = false) => ({ id, requiredPoints, premium });

describe('buildRewardTrackMilestones', () => {
    it('makes one stop per threshold, by rising points, with the tiers apart', () => {
        const stops = buildRewardTrackMilestones([prize('p300', 300, true), prize('f50', 50), prize('p50', 50, true), prize('f300', 300), prize('f120', 120)]);

        expect(stops.map((stop) => stop.points)).toEqual([50, 120, 300]);
        expect(stops.map((stop) => stop.free.map((entry) => entry.id))).toEqual([['f50'], ['f120'], ['f300']]);
        expect(stops.map((stop) => stop.premium.map((entry) => entry.id))).toEqual([['p50'], [], ['p300']]);
    });

    it('keeps several prizes of one tier at one stop, in the order they came', () => {
        const [stop] = buildRewardTrackMilestones([prize('b', 10), prize('a', 10)]);

        expect(stop.free.map((entry) => entry.id)).toEqual(['b', 'a']);
    });

    it('is empty without prizes', () => {
        expect(buildRewardTrackMilestones([])).toEqual([]);
    });
});

describe('getRewardTrackNextStop', () => {
    const stops = [50, 100, 300];

    it('heads for the first stop from nothing', () => {
        expect(getRewardTrackNextStop(stops, 20)).toEqual({ next: 50, remaining: 30, ratio: 0.4 });
    });

    it('measures from the stop before', () => {
        expect(getRewardTrackNextStop(stops, 150)).toEqual({ next: 300, remaining: 150, ratio: 0.25 });
        // Standing on a stop, the way to the next one starts.
        expect(getRewardTrackNextStop(stops, 100)).toEqual({ next: 300, remaining: 200, ratio: 0 });
    });

    it('has nothing left once every stop is reached, or without stops', () => {
        expect(getRewardTrackNextStop(stops, 1035)).toEqual({ next: null, remaining: 0, ratio: 1 });
        expect(getRewardTrackNextStop([], 5)).toEqual({ next: null, remaining: 0, ratio: 1 });
    });
});

describe('getRewardTrackRowFill', () => {
    const stops = [50, 100, 300];
    const fills = (points: number) => stops.map((_, index) => getRewardTrackRowFill(stops, index, points));

    it('fills the first row towards its stop from no points', () => {
        expect(fills(0)).toEqual([0, 0, 0]);
        expect(fills(25)).toEqual([0.25, 0, 0]);
        expect(fills(50)).toEqual([0.5, 0, 0]);
    });

    it('fills the lower half of a row, then the upper half of the next, on the way between two stops', () => {
        expect(fills(60)).toEqual([0.7, 0, 0]);
        expect(fills(75)).toEqual([1, 0, 0]);
        expect(fills(90)).toEqual([1, 0.3, 0]);
        expect(fills(100)).toEqual([1, 0.5, 0]);
        expect(fills(200)).toEqual([1, 1, 0]);
    });

    it('ends at the last stop', () => {
        expect(fills(299)).toEqual([1, 1, 0.495]);
        expect(fills(300)).toEqual([1, 1, 1]);
        expect(fills(1035)).toEqual([1, 1, 1]);
    });

    it('is empty outside the stops', () => {
        expect(getRewardTrackRowFill(stops, -1, 500)).toBe(0);
        expect(getRewardTrackRowFill(stops, 3, 500)).toBe(0);
        expect(getRewardTrackRowFill([], 0, 500)).toBe(0);
    });
});
