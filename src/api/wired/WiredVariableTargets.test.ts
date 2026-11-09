import { describe, expect, it } from 'vitest';
import { fromOfficialComparison, fromOfficialVariableTarget, toOfficialComparison, toOfficialVariableTarget } from './WiredVariableTargets';

describe('WiredVariableTargets', () =>
{
    it('maps our kinds to the official targets and back', () =>
    {
        expect([ 0, 1, 2, 3 ].map(toOfficialVariableTarget)).toEqual([ 1, 0, -20, -10 ]);
        expect([ 1, 0, -20, -10 ].map(fromOfficialVariableTarget)).toEqual([ 0, 1, 2, 3 ]);
    });

    it('maps the comparisons both ways', () =>
    {
        for(let ours = 0; ours < 6; ours++) expect(fromOfficialComparison(toOfficialComparison(ours))).toBe(ours);
        expect(toOfficialComparison(2)).toBe(1); // equals
        expect(toOfficialComparison(0)).toBe(2); // greater than
    });
});
