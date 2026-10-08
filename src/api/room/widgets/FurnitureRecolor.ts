import { FurnitureType, IFurnitureData } from '@octane/renderer';

export const RECOLOR_SCOPE_THIS = 0;
export const RECOLOR_SCOPE_SAME_IN_ROOM = 1;

export const recolorVariants = (all: IFurnitureData[], className: string): IFurnitureData[] =>
{
    if (!all || !className) return [];

    const variants = all.filter((data) => data && data.type === FurnitureType.FLOOR && data.hasIndexedColor && data.className === className);
    const buildersClub = variants.filter((data) => data.availableForBuildersClub);
    const chosen = buildersClub.length ? buildersClub : variants;

    return [...chosen].sort((a, b) => a.colorIndex - b.colorIndex);
};

export const colorIndexesInRoom = (roomFurni: IFurnitureData[], className: string): number[] =>
{
    const indexes = new Set<number>();

    for (const data of roomFurni ?? []) if (data && data.hasIndexedColor && data.className === className) indexes.add(data.colorIndex);

    return [...indexes].sort((a, b) => a - b);
};

export const recolorSwatch = (data: IFurnitureData): number =>
{
    let color = 0xffffff;

    for (const value of data?.colors ?? []) if (value !== 0xffffff) color = value;

    return color;
};
