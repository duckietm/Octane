import { IFurnitureData } from '@octane/renderer';
import { IPurchasableOffer, recolorSwatch } from '../../../../../api';

export interface BuildersBlockFamily {
    className: string;
    variants: Map<number, IPurchasableOffer>;
    colorIndexes: number[];
}

const WHITE = 0xffffff;

export const swatchColor = (offer: IPurchasableOffer): number =>
{
    const colors = offer?.product?.furnitureData?.colors;
    let color = WHITE;

    if (colors) for (const value of colors) if (value !== WHITE) color = value;

    return color;
};

export const groupBlockFamilies = (offers: IPurchasableOffer[]): BuildersBlockFamily[] =>
{
    const families = new Map<string, BuildersBlockFamily>();

    for (const offer of offers ?? [])
    {
        const furniData = offer?.product?.furnitureData;

        if (!furniData || !furniData.hasIndexedColor) continue;

        let family = families.get(furniData.className);

        if (!family)
        {
            family = { className: furniData.className, variants: new Map(), colorIndexes: [] };
            families.set(furniData.className, family);
        }

        if (!family.variants.has(furniData.colorIndex)) family.variants.set(furniData.colorIndex, offer);
    }

    for (const family of families.values()) family.colorIndexes = [...family.variants.keys()].sort((a, b) => a - b);

    return [...families.values()];
};

export const pickVariant = (family: BuildersBlockFamily, colorIndex: number): IPurchasableOffer | null =>
{
    if (!family || !family.colorIndexes.length) return null;

    return family.variants.get(colorIndex) ?? family.variants.get(family.colorIndexes[0]) ?? null;
};

export interface BuildersBlockColors {
    all: number;
    perShape: Record<string, number>;
}

export const NO_BLOCK_COLORS: BuildersBlockColors = { all: -1, perShape: {} };

export const blockColorOf = (colors: BuildersBlockColors, className: string): number => colors.perShape[className] ?? colors.all;

export const pickBlockColor = (colors: BuildersBlockColors, className: string, colorIndex: number, everyShape: boolean): BuildersBlockColors =>
    everyShape ? { all: colorIndex, perShape: {} } : { all: colors.all, perShape: { ...colors.perShape, [className]: colorIndex } };

export const roomColorIndexes = (family: BuildersBlockFamily, families: BuildersBlockFamily[], roomFurni: IFurnitureData[]): number[] =>
{
    if (!family) return [];

    const pageShapes = new Set(families.map((entry) => entry.className));
    const roomColors = new Set<number>();

    for (const data of roomFurni ?? []) if (data && data.hasIndexedColor && pageShapes.has(data.className)) roomColors.add(recolorSwatch(data));

    return family.colorIndexes.filter((index) => roomColors.has(swatchColor(family.variants.get(index))));
};
