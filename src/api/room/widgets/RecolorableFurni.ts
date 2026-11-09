import { GetConfiguration } from '@octane/renderer';
import { SHIPPED_RECOLORABLE_BC } from './RecolorableBcVariables';

/**
 * Habbo's recolourable Builders Club furni (*_recolorable): one furni per shape whose colour is chosen
 * per item. Their colours come from the recolorable_bc external variables, as in the official client;
 * the emulator checks the same palettes.
 */
export const RECOLOR_SCOPE_THIS = 0;
export const RECOLOR_SCOPE_SAME_COLOR = 1;
export const RECOLOR_SCOPE_SAME_TYPE = 2;
export const RECOLOR_SCOPE_SAME_TYPE_AND_COLOR = 3;
export const RECOLOR_SCOPES = [RECOLOR_SCOPE_THIS, RECOLOR_SCOPE_SAME_COLOR, RECOLOR_SCOPE_SAME_TYPE, RECOLOR_SCOPE_SAME_TYPE_AND_COLOR];

export const NO_RECOLOR = -1;

const PALETTE_TO_FURNI = 'recolorable_bc.palette_to_furni';
const PALETTE_PREFIX = 'recolorable_bc.palette.';
const DEFAULT_PALETTE = 'default';

export type RecolorableVariableReader = (key: string) => string;

/** The hotel's value of a recolorable_bc variable, else Habbo's. */
export const readRecolorableVariable: RecolorableVariableReader = (key) =>
{
    const configured = GetConfiguration()?.getValue<string>(key, null);

    return (typeof configured === 'string' && configured.length) ? configured : (SHIPPED_RECOLORABLE_BC[key] ?? '');
};

export const isRecolorableClass = (className: string): boolean => !!className && className.toLowerCase().endsWith('_recolorable');

/** "palette=class,class;..." to the palette of each class. A class listed twice takes the last palette. */
export const parsePaletteToFurni = (value: string): Map<string, string> =>
{
    const byFurni = new Map<string, string>();

    for (const group of (value ?? '').split(';'))
    {
        const separator = group.indexOf('=');

        if (separator < 0) continue;

        const palette = group.substring(0, separator).trim();

        for (const furni of group.substring(separator + 1).split(','))
        {
            const name = furni.trim().toLowerCase();

            if (name.length) byFurni.set(name, palette);
        }
    }

    return byFurni;
};

/** A comma list of hex colours to packed 0xRRGGBB values, in display order. */
export const parsePaletteColors = (value: string): number[] =>
    (value ?? '')
        .split(',')
        .map((hex) => hex.trim())
        .filter((hex) => /^[0-9a-fA-F]{6}$/.test(hex))
        .map((hex) => parseInt(hex, 16));

/** The colours a recolourable furni may take: its palette by classname, or the default one. */
export const recolorablePalette = (className: string, read: RecolorableVariableReader = readRecolorableVariable): number[] =>
{
    const name = parsePaletteToFurni(read(PALETTE_TO_FURNI)).get((className ?? '').toLowerCase()) ?? DEFAULT_PALETTE;

    return parsePaletteColors(read(PALETTE_PREFIX + name));
};

/**
 * The colour of every recolourable furni on a catalogue page once `rgb` is picked (AIR's
 * RecolorableFurnitureCatalogWidget.applyColor): the picked colour where its palette has it, otherwise its first colour.
 */
export const recolorPageColors = (classNames: string[], rgb: number, read: RecolorableVariableReader = readRecolorableVariable): Map<string, number> =>
{
    const colors = new Map<string, number>();

    for (const className of classNames)
    {
        if (!isRecolorableClass(className)) continue;

        const palette = recolorablePalette(className, read);

        if (palette.length) colors.set(className, palette.includes(rgb) ? rgb : palette[0]);
    }

    return colors;
};

const channel = (value: string): number =>
{
    if ((typeof value !== 'string') || !/^[0-9]{1,3}$/.test(value)) return -1;

    const parsed = parseInt(value, 10);

    return (parsed > 255) ? -1 : parsed;
};

/** The colour in a furni data map ("r", "g", "b"); NO_RECOLOR when it has none. */
export const recolorOfData = (data: { [key: string]: string }): number =>
{
    if (!data) return NO_RECOLOR;

    const r = channel(data.r);
    const g = channel(data.g);
    const b = channel(data.b);

    if ((r < 0) || (g < 0) || (b < 0)) return NO_RECOLOR;

    return (r << 16) | (g << 8) | b;
};

/** "R,G,B" as the catalog sends it with a Builders Club placement. */
export const formatRecolor = (rgb: number): string => `${(rgb >> 16) & 0xff},${(rgb >> 8) & 0xff},${rgb & 0xff}`;

export const recolorHex = (rgb: number): string => `#${(rgb & 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`;

export const recolorChannels = (rgb: number): [number, number, number] => [(rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff];

/** The distinct colours of the given furni data maps, in first-seen order. */
export const distinctRecolors = (dataMaps: { [key: string]: string }[]): number[] =>
{
    const colors: number[] = [];

    for (const data of dataMaps ?? [])
    {
        const color = recolorOfData(data);

        if ((color !== NO_RECOLOR) && !colors.includes(color)) colors.push(color);
    }

    return colors;
};
