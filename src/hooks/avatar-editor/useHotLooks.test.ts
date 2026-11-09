// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { groupHotLooksByGender, MAXIMUM_HOT_LOOKS } from './useHotLooks';

describe('groupHotLooksByGender', () => {
    it('files each look under its gender and drops looks without a figure or gender', () => {
        const grouped = groupHotLooksByGender([
            { gender: 'M', figureString: 'hd-180-1' },
            { gender: 'f', figureString: 'hd-600-1' },
            { gender: 'X', figureString: 'hd-1-1' },
            { gender: 'M', figureString: '' }
        ]);

        expect(grouped.M).toEqual([{ gender: 'M', figure: 'hd-180-1' }]);
        expect(grouped.F).toEqual([{ gender: 'F', figure: 'hd-600-1' }]);
    });

    it('keeps at most the official 20 looks per gender', () => {
        const looks = Array.from({ length: 25 }, (_, index) => ({ gender: 'F', figureString: `hd-${index}-1` }));

        expect(groupHotLooksByGender(looks).F).toHaveLength(MAXIMUM_HOT_LOOKS);
    });
});
