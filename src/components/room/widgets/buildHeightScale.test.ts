import { describe, expect, it } from 'vitest';
import { formatBuildHeight, getBuildHeightMarks, roundBuildHeight } from './buildHeightScale';

const numbered = (min: number, max: number) => getBuildHeightMarks(min, max).filter((mark) => mark.major).map((mark) => mark.value);

describe('getBuildHeightMarks', () => {
    it('numbers round steps in at most 4 parts, with a plain mark between two numbers', () => {
        expect(numbered(0, 40)).toEqual([0, 10, 20, 30, 40]);
        expect(getBuildHeightMarks(0, 40).map((mark) => mark.value)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40]);
        expect(numbered(-40, 40)).toEqual([-40, -20, 0, 20, 40]);
        expect(numbered(0, 3)).toEqual([0, 1, 2, 3]);
    });

    it('places each mark along the bar, from 0 to 100 %', () => {
        const marks = getBuildHeightMarks(-40, 40);

        expect(marks[0].position).toBe(0);
        expect(marks.find((mark) => mark.value === 0).position).toBe(50);
        expect(marks[marks.length - 1].position).toBe(100);
    });

    it('draws no ruler for an empty range', () => {
        expect(getBuildHeightMarks(0, 0)).toEqual([]);
        expect(getBuildHeightMarks(10, 0)).toEqual([]);
    });
});

describe('formatBuildHeight', () => {
    it('writes heights like the height field, in the viewer locale and with one decimal at most', () => {
        expect(formatBuildHeight(2, 'en-US')).toBe('2');
        expect(formatBuildHeight(1.5, 'en-US')).toBe('1.5');
        expect(formatBuildHeight(1.5, 'fr-FR')).toBe('1,5');
        expect(formatBuildHeight(-40, 'fr-FR')).toBe('-40');
    });
});

describe('roundBuildHeight', () => {
    it('keeps a tenth without float noise', () => {
        expect(roundBuildHeight(0.1 + 0.2)).toBe(0.3);
        expect(roundBuildHeight(2.449)).toBe(2.4);
    });
});
