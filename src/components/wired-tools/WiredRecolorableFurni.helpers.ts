import type { IFurnitureData } from '@octane/renderer';
import { recolorSwatch } from '../../api';
import type { InspectionVariable } from './WiredCreatorTools.types';

export const RECOLORABLE_FURNI_RGB = '~recolorable_furni.color.rgb';
export const RECOLORABLE_FURNI_RED = '~recolorable_furni.color.rgb.r';
export const RECOLORABLE_FURNI_GREEN = '~recolorable_furni.color.rgb.g';
export const RECOLORABLE_FURNI_BLUE = '~recolorable_furni.color.rgb.b';

export const RECOLORABLE_FURNI_KEYS = [RECOLORABLE_FURNI_RGB, RECOLORABLE_FURNI_RED, RECOLORABLE_FURNI_GREEN, RECOLORABLE_FURNI_BLUE];

export const isRecolorableFurniKey = (key: string) => RECOLORABLE_FURNI_KEYS.includes(key);

export const formatRgb = (rgb: number) => `#${(rgb & 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`;

/** The colour rows of a colour variant, as Habbo's inspection shows them; none for other furni. */
export const recolorableFurniVariables = (data: IFurnitureData, editable: boolean): InspectionVariable[] =>
{
    if (!data?.hasIndexedColor) return [];

    const rgb = recolorSwatch(data);

    return [
        { key: RECOLORABLE_FURNI_RGB, value: formatRgb(rgb), editable, valueClassName: 'text-[#9b30d9]' },
        { key: RECOLORABLE_FURNI_RED, value: String((rgb >> 16) & 0xff), editable },
        { key: RECOLORABLE_FURNI_GREEN, value: String((rgb >> 8) & 0xff), editable },
        { key: RECOLORABLE_FURNI_BLUE, value: String(rgb & 0xff), editable }
    ];
};

/** A typed colour: #RRGGBB (or a number) for the colour, 0-255 for a part; null when it is not valid. */
export const parseRecolorableFurniValue = (key: string, text: string): number | null =>
{
    const value = (text ?? '').trim();

    if (key === RECOLORABLE_FURNI_RGB)
    {
        const hex = value.startsWith('#') ? value.slice(1) : null;
        const parsed = hex !== null ? (/^[0-9a-f]{6}$/i.test(hex) ? parseInt(hex, 16) : NaN) : /^\d+$/.test(value) ? Number(value) : NaN;

        return Number.isInteger(parsed) && parsed >= 0 && parsed <= 0xffffff ? parsed : null;
    }

    if (!/^\d+$/.test(value)) return null;

    const part = Number(value);

    return part >= 0 && part <= 0xff ? part : null;
};
