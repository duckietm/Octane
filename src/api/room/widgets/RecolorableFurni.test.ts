import { describe, expect, it } from 'vitest';
import { SHIPPED_RECOLORABLE_BC } from './RecolorableBcVariables';
import {
    distinctRecolors,
    formatRecolor,
    isRecolorableClass,
    NO_RECOLOR,
    parsePaletteToFurni,
    recolorablePalette,
    recolorHex,
    recolorOfData,
    recolorPageColors
} from './RecolorableFurni';

const shipped = (key: string) => SHIPPED_RECOLORABLE_BC[key] ?? '';

describe('recolourable furni', () =>
{
    it('knows them by their classname', () =>
    {
        expect(isRecolorableClass('bc_quartercircle_recolorable')).toBe(true);
        expect(isRecolorableClass('bc_quartercircle')).toBe(false);
        expect(isRecolorableClass(null)).toBe(false);
    });

    it('gives each furni the palette Habbo lists it under, else the default one', () =>
    {
        expect(recolorablePalette('bc_quartercircle_recolorable', shipped)).toHaveLength(69);
        expect(recolorablePalette('not_listed_recolorable', shipped)).toHaveLength(69);
        expect(recolorablePalette('bc_quartercircle_recolorable', shipped)[0]).toBe(0xffffff);
    });

    it('lets the last palette win when a furni is listed twice', () =>
    {
        expect(parsePaletteToFurni('a=x,y;b=Y').get('y')).toBe('b');
        expect(recolorablePalette('y', (key) => ({ 'recolorable_bc.palette_to_furni': 'a=y;b=y', 'recolorable_bc.palette.b': '010203,zz' })[key] ?? '')).toEqual([0x010203]);
    });

    it('reads the colour from r, g and b', () =>
    {
        expect(recolorOfData({ state: '0', r: '255', g: '128', b: '0' })).toBe(0xff8000);
        expect(recolorOfData({ state: '0' })).toBe(NO_RECOLOR);
        expect(recolorOfData({ r: '256', g: '0', b: '0' })).toBe(NO_RECOLOR);
        expect(recolorOfData(null)).toBe(NO_RECOLOR);
    });

    it('formats the colour for the server and for people', () =>
    {
        expect(formatRecolor(0xff8000)).toBe('255,128,0');
        expect(recolorHex(0x0a0b0c)).toBe('#0A0B0C');
    });

    it('lists the colours used, once each', () =>
    {
        expect(distinctRecolors([{ r: '1', g: '2', b: '3' }, { state: '0' }, { r: '1', g: '2', b: '3' }, { r: '0', g: '0', b: '0' }])).toEqual([0x010203, 0]);
    });

    it('colours every furni on a page with the picked colour, or its own first colour (AIR applyColor)', () =>
    {
        const vars: Record<string, string> = {
            'recolorable_bc.palette_to_furni': 'warm=bc_block_recolorable,bc_cone_recolorable;cold=bc_glass_recolorable',
            'recolorable_bc.palette.warm': 'FF0000,00FF00',
            'recolorable_bc.palette.cold': '112233'
        };
        const read = (key: string) => vars[key] ?? '';
        const colors = recolorPageColors(['bc_block_recolorable', 'bc_cone_recolorable', 'bc_glass_recolorable', 'chair_plain'], 0x00ff00, read);

        expect([...colors]).toEqual([
            ['bc_block_recolorable', 0x00ff00],
            ['bc_cone_recolorable', 0x00ff00],
            ['bc_glass_recolorable', 0x112233]
        ]);
    });
});
