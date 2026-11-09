import { FurnitureType, IFurnitureData } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { recolorSwatch } from './FurnitureRecolor';

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
    it('uses the last part colour that is not white as the swatch', () =>
    {
        expect(recolorSwatch(furni('bc_cone', 7))).toBe(0x100007);
        expect(recolorSwatch(null)).toBe(0xffffff);
    });
});
