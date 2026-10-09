import { describe, expect, it } from 'vitest';
import { sanitizeAvatarFigure } from './SanitizeAvatarFigure';

const map = <T,>(values: T[]) => ({ getValues: () => values });

const partSet = (id: number, extra: Record<string, unknown> = {}) => ({ id, gender: 'U', clubLevel: 0, isSelectable: true, isSellable: false, ...extra });

const colors = [
    { id: 1, clubLevel: 0, isSelectable: true },
    { id: 9, clubLevel: 2, isSelectable: true }
];

const structure = {
    getSetType: (type: string) => {
        const sets: Record<string, ReturnType<typeof partSet>[]> = {
            hd: [partSet(180), partSet(600, { gender: 'F' })],
            ch: [partSet(215), partSet(3000, { clubLevel: 2 }), partSet(4000, { isSellable: true })],
            ha: [partSet(1002, { clubLevel: 2 })]
        };

        if (!sets[type]) return null;

        return { paletteID: 1, getPartSet: (id: number) => sets[type].find((set) => set.id === id), partSets: map(sets[type]) };
    },
    getPalette: () => ({ colors: map(colors), getColor: (id: number) => colors.find((color) => color.id === id) })
} as never;

const options = { gender: 'M', clubLevel: 0, ownedSetIds: [], mandatorySetTypes: ['hd', 'ch'] };

describe('sanitizeAvatarFigure', () => {
    it('keeps a look the user may wear', () => {
        expect(sanitizeAvatarFigure('hd-180-1.ch-215-1', structure, options)).toBe('hd-180-1.ch-215-1');
    });

    it('drops optional club parts and swaps mandatory club or unowned parts for a wearable one', () => {
        expect(sanitizeAvatarFigure('hd-180-1.ch-3000-1.ha-1002-1', structure, options)).toBe('hd-180-1.ch-215-1');
        expect(sanitizeAvatarFigure('hd-180-1.ch-4000-1', structure, options)).toBe('hd-180-1.ch-215-1');
        expect(sanitizeAvatarFigure('hd-180-1.ch-4000-1', structure, { ...options, ownedSetIds: [4000] })).toBe('hd-180-1.ch-4000-1');
    });

    it('replaces the other gender\'s parts and club colours', () => {
        expect(sanitizeAvatarFigure('hd-600-9.ch-215-1', structure, options)).toBe('hd-180-1.ch-215-1');
    });

    it('adds a missing mandatory part', () => {
        expect(sanitizeAvatarFigure('hd-180-1', structure, options)).toBe('hd-180-1.ch-215');
    });
});
