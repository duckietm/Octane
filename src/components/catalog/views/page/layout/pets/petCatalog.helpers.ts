export interface PetPaletteLike {
    breedId: number;
    paletteId: number;
    rare: boolean;
    sellable: boolean;
    type: number;
    clubOnly?: boolean;
}

export interface PetColorResultLike {
    primaryColor: number;
    secondaryColor: number;
}

export interface NewPetPaletteChoice<TPalette extends PetPaletteLike = PetPaletteLike> {
    colors: number[];
    palette: TPalette;
}

export const isLegacyPetType = (petType: number) => petType >= 0 && petType <= 7;

export const getPetNameMaxLength = (petType: number) => (isLegacyPetType(petType) ? 15 : 16);

export const filterPetPalettes = <TPalette extends PetPaletteLike>(petType: number, palettes: readonly TPalette[]) =>
    palettes.filter((palette) => palette.sellable && palette.type === petType);

export const buildNewPetPaletteChoices = <TPalette extends PetPaletteLike>(
    petType: number,
    palettes: readonly TPalette[],
    getColorResult: (petType: number, paletteId: number) => PetColorResultLike | null
): NewPetPaletteChoice<TPalette>[] => {
    const choices: NewPetPaletteChoice<TPalette>[] = [];

    for (const palette of filterPetPalettes(petType, palettes)) {
        const result = getColorResult(petType, palette.paletteId);

        if (!result) continue;

        choices.push({
            colors:
                result.primaryColor === result.secondaryColor
                    ? [result.primaryColor]
                    : [result.primaryColor, result.secondaryColor],
            palette
        });

        if (choices.length === 20) break;
    }

    return choices;
};

const toColorHex = (color: number) => Math.max(0, Math.min(0xffffff, color)).toString(16).toUpperCase().padStart(6, '0');

export const buildPetPurchaseExtraData = (name: string, petType: number, palette: PetPaletteLike, selectedColor: number) => {
    const color = isLegacyPetType(petType) ? selectedColor : 0xffffff;

    return `${name}\n${palette.paletteId}\n${toColorHex(color)}`;
};
