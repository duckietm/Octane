import { describe, expect, it } from 'vitest';
import { formatScore, getClearType, getScoreType, isConfigured, isTimeScore, scoreToTime } from './useFurnitureHighScoreWidget';

// The score type is an index into a list the client does not own: the server sends the number and
// the official client reads ["perteam","mostwins","classic","fastesttime","longesttime"]. The board
// knew only the first three, so both time types fell off the end.

describe('score types', () => {
    it('covers all five the official client knows', () => {
        expect([0, 1, 2, 3, 4].map(getScoreType)).toEqual(['perteam', 'mostwins', 'classic', 'fastesttime', 'longesttime']);
    });

    it('reads the two time types as times and the other three as points', () => {
        expect([0, 1, 2].map(isTimeScore)).toEqual([false, false, false]);
        expect([3, 4].map(isTimeScore)).toEqual([true, true]);
    });

    it('keeps the four clear types', () => {
        expect([0, 1, 2, 3].map(getClearType)).toEqual(['alltime', 'daily', 'weekly', 'monthly']);
    });
});

describe('a board whose type never arrived', () => {
    it('is not configured at -1, so nothing indexes the list with -1', () => {
        expect(isConfigured(-1, -1)).toBe(false);
        expect(isConfigured(-1, 0)).toBe(false);
        expect(isConfigured(0, -1)).toBe(false);
    });

    it('is not configured past the end of either list', () => {
        expect(isConfigured(5, 0)).toBe(false);
        expect(isConfigured(0, 4)).toBe(false);
    });

    it('is configured for every real combination', () => {
        for (let score = 0; score < 5; score++) {
            for (let clear = 0; clear < 4; clear++) expect(isConfigured(score, clear)).toBe(true);
        }
    });

    it('reports an unknown type as points rather than throwing', () => {
        expect(isTimeScore(-1)).toBe(false);
        expect(isTimeScore(99)).toBe(false);
    });
});

describe('scoreToTime', () => {
    it('writes minutes and seconds zero padded', () => {
        expect(scoreToTime(125, 2)).toBe('02:05');
        expect(scoreToTime(0, 2)).toBe('00:00');
        expect(scoreToTime(59, 2)).toBe('00:59');
        expect(scoreToTime(60, 2)).toBe('01:00');
    });

    it('writes hours without padding them', () => {
        expect(scoreToTime(3661, 3)).toBe('1:01:01');
        expect(scoreToTime(3600, 3)).toBe('1:00:00');
        expect(scoreToTime(45296, 3)).toBe('12:34:56');
    });

    it('gives back a plain number when the part count is out of range', () => {
        expect(scoreToTime(90, 0)).toBe('90');
        expect(scoreToTime(90, 4)).toBe('90');
    });
});

describe('formatScore', () => {
    it('leaves a points board alone', () => {
        expect(formatScore(125, 2)).toBe('125');
        expect(formatScore(0, 0)).toBe('0');
    });

    it('writes a time board as a duration, and picks hours only past the hour', () => {
        expect(formatScore(125, 4)).toBe('02:05');
        expect(formatScore(3599, 3)).toBe('59:59');
        expect(formatScore(3600, 3)).toBe('1:00:00');
    });
});
