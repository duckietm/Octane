import { describe, expect, it } from 'vitest';
import { groupHotLooksByGender, MAX_HOT_LOOKS, normalizeHotLookGender, selectHotLookFigure } from './HotLooks';

describe('hot looks helpers', () => {
    it('normalizes every gender spelling onto M / F', () => {
        expect(normalizeHotLookGender('m')).toBe('M');
        expect(normalizeHotLookGender(' Female ')).toBe('F');
        expect(normalizeHotLookGender('F')).toBe('F');
        expect(normalizeHotLookGender('')).toBe('M');
        expect(normalizeHotLookGender(null)).toBe('M');
    });

    it('groups looks per gender in server order and caps each list at 20', () => {
        const looks = [
            { gender: 'F', figureString: 'hd-600-1' },
            { gender: 'm', figureString: 'hd-180-1' },
            { gender: 'M', figureString: 'hd-180-2' }
        ];

        const grouped = groupHotLooksByGender(looks);

        expect(grouped.M.map((look) => look.figureString)).toEqual(['hd-180-1', 'hd-180-2']);
        expect(grouped.F.map((look) => look.figureString)).toEqual(['hd-600-1']);

        const many = Array.from({ length: 30 }, (_, index) => ({ gender: 'M', figureString: `hd-180-${index}` }));

        expect(groupHotLooksByGender(many).M).toHaveLength(MAX_HOT_LOOKS);
        expect(groupHotLooksByGender(null).F).toEqual([]);
    });

    it('selects the clicked look of the current gender and ignores empty figures', () => {
        const looks = [
            { gender: 'M', figureString: 'hd-180-1' },
            { gender: 'M', figureString: '' },
            { gender: 'F', figureString: 'hd-600-1' }
        ];

        expect(selectHotLookFigure(looks, 'M', 0)).toEqual({ gender: 'M', figureString: 'hd-180-1' });
        expect(selectHotLookFigure(looks, 'M', 1)).toBeNull();
        expect(selectHotLookFigure(looks, 'F', 0)).toEqual({ gender: 'F', figureString: 'hd-600-1' });
        expect(selectHotLookFigure(looks, 'F', 1)).toBeNull();
    });
});
