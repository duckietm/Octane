import { describe, expect, it } from 'vitest';
import { GroupBadgePart } from './GroupBadgePart';

describe('GroupBadgePart', () => {
    describe('fromBadgeSettings', () => {
        it('opens on the server default badge: a base, then four symbols', () => {
            const parts = GroupBadgePart.fromBadgeSettings([
                { key: 10, color: 3, position: 4 },
                { key: 25, color: 17, position: 5 },
                { key: 25, color: 17, position: 3 },
                { key: 29, color: 11, position: 4 },
                { key: 0, color: 0, position: 0 }
            ]);

            expect(parts.map((part) => part.type)).toEqual(['b', 's', 's', 's', 's']);
            expect(parts.map((part) => part.previewCode)).toEqual(['b10034', 's25175', 's25173', 's29114', null]);
            expect(GroupBadgePart.serialize(parts)).toEqual([10, 3, 4, 25, 17, 5, 25, 17, 3, 29, 11, 4]);
        });

        it('pads a short default with empty symbol layers', () => {
            const parts = GroupBadgePart.fromBadgeSettings([{ key: 10, color: 3, position: 4 }]);

            expect(parts).toHaveLength(GroupBadgePart.LAYER_COUNT);
            expect(parts.slice(1).every((part) => part.type === GroupBadgePart.SYMBOL && part.key === 0)).toBe(true);
        });

        it('gives nothing when the server sent no default', () => {
            expect(GroupBadgePart.fromBadgeSettings([])).toEqual([]);
        });
    });

    describe('withPaletteColors', () => {
        it('shows a colour the palette lacks as the first palette colour', () => {
            const parts = GroupBadgePart.withPaletteColors(
                [new GroupBadgePart(GroupBadgePart.BASE, 10, 3, 4), new GroupBadgePart(GroupBadgePart.SYMBOL, 0, 0, 0)],
                [1, 2, 3]
            );

            expect(parts.map((part) => part.color)).toEqual([3, 1]);
            expect(parts[1].position).toBe(0);
        });

        it('leaves the parts alone while the palette is not loaded', () => {
            const parts = [new GroupBadgePart(GroupBadgePart.SYMBOL, 0, 0, 0)];

            expect(GroupBadgePart.withPaletteColors(parts, [])).toBe(parts);
        });
    });
});
