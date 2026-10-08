import { FurnitureType, IFurnitureData } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { colorIndexesInRoom, recolorSwatch, recolorVariants } from './FurnitureRecolor';

const furni = (className: string, colorIndex: number, extra: Partial<IFurnitureData> = {}): IFurnitureData =>
    ({
        type: FurnitureType.FLOOR,
        id: colorIndex,
        className,
        colorIndex,
        hasIndexedColor: colorIndex > 0,
        colors: [0xffffff, 0x100000 + colorIndex],
        availableForBuildersClub: false,
        ...extra
    }) as unknown as IFurnitureData;

describe('furniture recolor', () =>
{
    it('lists the floor colour variants of a class, lowest colour first', () =>
    {
        const variants = recolorVariants(
            [furni('bc_cone', 3), furni('bc_cube', 1), furni('bc_cone', 1), furni('bc_cone', 2, { type: FurnitureType.WALL })],
            'bc_cone'
        );

        expect(variants.map((data) => data.colorIndex)).toEqual([1, 3]);
    });

    it('keeps to the Builders Club variants when the furnidata marks some', () =>
    {
        const variants = recolorVariants([furni('bc_cone', 1), furni('bc_cone', 2, { availableForBuildersClub: true })], 'bc_cone');

        expect(variants.map((data) => data.colorIndex)).toEqual([2]);
    });

    it('collects the colours of the class used in the room', () =>
    {
        expect(colorIndexesInRoom([furni('bc_cone', 5), furni('bc_cone', 2), furni('bc_cone', 5), furni('bc_cube', 9)], 'bc_cone')).toEqual([2, 5]);
    });

    it('uses the last part colour that is not white as the swatch', () =>
    {
        expect(recolorSwatch(furni('bc_cone', 7))).toBe(0x100007);
        expect(recolorSwatch(null)).toBe(0xffffff);
    });
});
