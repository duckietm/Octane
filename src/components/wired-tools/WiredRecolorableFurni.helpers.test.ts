import type { IFurnitureData } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { EDITABLE_FURNI_VARIABLES } from './WiredCreatorTools.constants';
import {
    formatRgb,
    parseRecolorableFurniValue,
    RECOLORABLE_FURNI_BLUE,
    RECOLORABLE_FURNI_KEYS,
    RECOLORABLE_FURNI_RED,
    RECOLORABLE_FURNI_RGB,
    recolorableFurniVariables
} from './WiredRecolorableFurni.helpers';

const furni = (colors: number[], hasIndexedColor = true) => ({ colors, hasIndexedColor }) as unknown as IFurnitureData;

describe('recolorable furni variables', () =>
{
    it('shows the swatch colour and its parts for a colour variant only', () =>
    {
        expect(recolorableFurniVariables(furni([0xffffff, 0xffb7bc]), true).map((row) => [row.key, row.value, row.editable])).toEqual([
            [RECOLORABLE_FURNI_RGB, '#FFB7BC', true],
            ['~recolorable_furni.color.rgb.r', '255', true],
            ['~recolorable_furni.color.rgb.g', '183', true],
            ['~recolorable_furni.color.rgb.b', '188', true]
        ]);
        expect(recolorableFurniVariables(furni([0xaa0000], false), true)).toEqual([]);
        expect(recolorableFurniVariables(null, true)).toEqual([]);
    });

    it('formats a colour as #RRGGBB', () =>
    {
        expect(formatRgb(0x0000ff)).toBe('#0000FF');
    });

    it('reads a typed colour as #RRGGBB or a number and a part as 0-255', () =>
    {
        expect(parseRecolorableFurniValue(RECOLORABLE_FURNI_RGB, ' #ffb7bc ')).toBe(0xffb7bc);
        expect(parseRecolorableFurniValue(RECOLORABLE_FURNI_RGB, '255')).toBe(255);
        expect(parseRecolorableFurniValue(RECOLORABLE_FURNI_RGB, '#12345')).toBeNull();
        expect(parseRecolorableFurniValue(RECOLORABLE_FURNI_RGB, '16777216')).toBeNull();
        expect(parseRecolorableFurniValue(RECOLORABLE_FURNI_RED, '200')).toBe(200);
        expect(parseRecolorableFurniValue(RECOLORABLE_FURNI_BLUE, '256')).toBeNull();
        expect(parseRecolorableFurniValue(RECOLORABLE_FURNI_BLUE, '-1')).toBeNull();
        expect(parseRecolorableFurniValue(RECOLORABLE_FURNI_BLUE, 'abc')).toBeNull();
    });

    it('lets every colour row be edited in the inspection', () =>
    {
        for (const key of RECOLORABLE_FURNI_KEYS) expect(EDITABLE_FURNI_VARIABLES).toContain(key);
    });
});
