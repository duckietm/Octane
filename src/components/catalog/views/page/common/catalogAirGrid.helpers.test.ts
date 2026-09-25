import { describe, expect, it } from 'vitest';
import { getVisibleAirGridEntries } from './catalogAirGrid.helpers';

describe('getVisibleAirGridEntries', () => {
    const entry = (index: number, y: number, height: number) => ({ offer: { offerId: index } as any, index, x: 0, y, width: 36, height });
    const entries = [entry(0, 0, 36), entry(1, 36, 36), entry(2, 500, 74), entry(3, 1000, 36)];

    it('returns the entries intersecting the viewport plus the overscan', () => {
        expect(getVisibleAirGridEntries(entries, 0, 100, 0).map((e) => e.index)).toEqual([0, 1]);
        expect(getVisibleAirGridEntries(entries, 0, 100, 450).map((e) => e.index)).toEqual([0, 1, 2]);
        expect(getVisibleAirGridEntries(entries, 480, 100, 0).map((e) => e.index)).toEqual([2]);
    });
    it('keeps an entry that starts above the window but ends inside it', () => {
        expect(getVisibleAirGridEntries(entries, 20, 10, 0).map((e) => e.index)).toEqual([0]);
    });
    it('returns every entry while the viewport is unmeasured', () => {
        expect(getVisibleAirGridEntries(entries, 0, 0)).toBe(entries);
    });
    it('handles an empty layout', () => {
        expect(getVisibleAirGridEntries([], 0, 100)).toEqual([]);
    });
});
