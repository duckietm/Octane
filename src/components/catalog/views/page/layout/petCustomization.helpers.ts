import { IFurnitureData } from '@octane/renderer';
import { FurniCategory } from '../../../../../api';

const parseNumberList = (value: string | undefined): number[] | null => {
    if (!value?.length) return null;

    const values = value.split(',').map((entry) => Number.parseInt(entry, 10));

    return values.length && values.every(Number.isInteger) ? values : null;
};

export const buildPetCustomizationPreviewFigure = (furnitureData: IFurnitureData | null | undefined): string | null => {
    if (!furnitureData?.customParams?.length) return null;

    const params = furnitureData.customParams.trim().split(/\s+/);
    const petType = Number.parseInt(params[0], 10);

    if (!Number.isInteger(petType) || petType < 0) return null;

    const parts: Array<[number, number, number]> = [];

    switch (furnitureData.specialType) {
        case FurniCategory.PET_SHAMPOO:
            if (params.length < 2) return null;
            break;
        case FurniCategory.PET_CUSTOM_PART:
        case FurniCategory.PET_SADDLE: {
            if (params.length < 4) return null;

            const layers = parseNumberList(params[1]);
            const partIds = parseNumberList(params[2]);
            const paletteIds = parseNumberList(params[3]);

            if (!layers || !partIds || !paletteIds || layers.length !== partIds.length || layers.length !== paletteIds.length) return null;

            layers.forEach((layerId, index) => parts.push([layerId, partIds[index], paletteIds[index]]));
            break;
        }
        case FurniCategory.PET_CUSTOM_PART_SHAMPOO: {
            if (params.length < 3) return null;

            const layers = parseNumberList(params[1]);
            const paletteIds = parseNumberList(params[2]);

            if (!layers || !paletteIds || layers.length !== paletteIds.length) return null;

            layers.forEach((layerId, index) => parts.push([layerId, -1, paletteIds[index]]));
            break;
        }
        default:
            return null;
    }

    return [petType, 2, 0xffffff, parts.length, ...parts.flat()].join(' ');
};
