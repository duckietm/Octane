import { IFurnitureData } from '@octane/renderer';

/** The swatch of an indexed-colour furni variant: its last non-white colour. */
export const recolorSwatch = (data: IFurnitureData): number =>
{
    let color = 0xffffff;

    for (const value of data?.colors ?? []) if (value !== 0xffffff) color = value;

    return color;
};
