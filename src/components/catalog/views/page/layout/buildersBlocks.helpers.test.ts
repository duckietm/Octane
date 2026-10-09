import { IFurnitureData } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { IPurchasableOffer } from '../../../../../api';
import { blockColorOf, groupBlockFamilies, NO_BLOCK_COLORS, pickBlockColor, pickVariant, roomColorIndexes, swatchColor } from './buildersBlocks.helpers';

const offer = (className: string, colorIndex: number, colors: number[] = [0xffffff, 0x112233]): IPurchasableOffer =>
    ({
        offerId: colorIndex,
        product: {
            furnitureData: {
                className,
                colorIndex,
                hasIndexedColor: colorIndex > 0,
                fullName: colorIndex > 0 ? `${className}*${colorIndex}` : className,
                colors
            }
        }
    }) as unknown as IPurchasableOffer;

describe('Builders Club building blocks', () =>
{
    it('groups colour variants by shape in page order, colours lowest first', () =>
    {
        const families = groupBlockFamilies([offer('bc_cone', 3), offer('bc_cube', 1), offer('bc_cone', 1), offer('plain', 0)]);

        expect(families.map((family) => family.className)).toEqual(['bc_cone', 'bc_cube']);
        expect(families[0].colorIndexes).toEqual([1, 3]);
    });

    it('does not reorder the page offers', () =>
    {
        const offers = [offer('bc_cone', 3), offer('bc_cone', 1)];
        groupBlockFamilies(offers);

        expect(offers.map((entry) => entry.offerId)).toEqual([3, 1]);
    });

    it('keeps the chosen colour when another shape has it, else takes its first', () =>
    {
        const [cone] = groupBlockFamilies([offer('bc_cone', 2), offer('bc_cone', 5)]);

        expect(pickVariant(cone, 5).offerId).toBe(5);
        expect(pickVariant(cone, 9).offerId).toBe(2);
        expect(pickVariant(null, 1)).toBeNull();
    });

    it('takes the last part colour that is not white as the swatch', () =>
    {
        expect(swatchColor(offer('bc_cone', 1, [0xffffff, 0xaa0000, 0xffffff]))).toBe(0xaa0000);
        expect(swatchColor(offer('bc_cone', 1, [0xffffff]))).toBe(0xffffff);
    });

    it('gives a colour to the picked shape only, or to every shape', () =>
    {
        const coneRed = pickBlockColor(NO_BLOCK_COLORS, 'bc_cone', 4, false);

        expect(blockColorOf(coneRed, 'bc_cone')).toBe(4);
        expect(blockColorOf(coneRed, 'bc_cube')).toBe(-1);

        const allBlue = pickBlockColor(coneRed, 'bc_cube', 7, true);

        expect(blockColorOf(allBlue, 'bc_cone')).toBe(7);
        expect(blockColorOf(allBlue, 'bc_cube')).toBe(7);

        const cubeGreen = pickBlockColor(allBlue, 'bc_cube', 2, false);

        expect(blockColorOf(cubeGreen, 'bc_cone')).toBe(7);
        expect(blockColorOf(cubeGreen, 'bc_cube')).toBe(2);
    });

    it('counts the colours of every block of the page in the room, matched by colour', () =>
    {
        const families = groupBlockFamilies([
            offer('bc_c', 1, [0xffffff, 0xaa0000]),
            offer('bc_c', 2, [0xffffff, 0x0000aa]),
            offer('bc_c', 3, [0xffffff, 0x00aa00]),
            offer('bc_a', 5, [0xffffff, 0xaa0000])
        ]);
        const inRoom = (className: string, colors: number[]) => ({ className, hasIndexedColor: true, colors }) as unknown as IFurnitureData;
        const room = [inRoom('bc_a', [0xffffff, 0xaa0000]), inRoom('bc_c', [0xffffff, 0x00aa00]), inRoom('other', [0xffffff, 0x0000aa])];

        expect(roomColorIndexes(families[0], families, room)).toEqual([1, 3]);
        expect(roomColorIndexes(families[0], families, [])).toEqual([]);
        expect(roomColorIndexes(null, families, room)).toEqual([]);
    });
});
