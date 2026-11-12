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

/**
 * The product code the server lists a pet's breeds for: `a0 pet<type>`, the pet's catalogue item name. It is built
 * from the pet type and not read from the hotel's product data: a hotel whose product data has no entry for the pet
 * asked for nothing, and the classic pets (types 0 to 7) then showed no preview and no breeds.
 */
export const petProductCode = (petType: number) => (Number.isInteger(petType) && petType >= 0 ? `a0 pet${petType}` : '');

/**
 * The palettes a pet's own asset holds, as sellable breeds: what the page offers when the server lists none (a hotel
 * without `pet_breeds` rows for the pet). The palette id doubles as the breed id.
 */
export const derivePetPalettes = (
    petType: number,
    hasPalette: (petType: number, paletteId: number) => boolean,
    maxPaletteId: number = 128
): PetPaletteLike[] => {
    const derived: PetPaletteLike[] = [];

    for (let paletteId = 0; paletteId <= maxPaletteId; paletteId++) {
        if (hasPalette(petType, paletteId)) {
            derived.push({ breedId: paletteId, paletteId, rare: false, sellable: true, type: petType, clubOnly: false });
        }
    }

    return derived;
};

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

/**
 * Choices for a pet whose asset carries no palettes at all (the bunnies, the pigeons): it has one look, drawn as it
 * is. The server's breeds are kept when it lists some; otherwise the pet is offered once, as palette 0.
 */
export const buildPalettelessPetChoices = <TPalette extends PetPaletteLike>(
    petType: number,
    palettes: readonly TPalette[]
): NewPetPaletteChoice<TPalette | PetPaletteLike>[] => {
    const sellable: (TPalette | PetPaletteLike)[] = filterPetPalettes(petType, palettes);

    if (!sellable.length) sellable.push({ breedId: 0, paletteId: 0, rare: false, sellable: true, type: petType, clubOnly: false });

    return sellable.slice(0, 20).map((palette) => ({ colors: [0xffffff], palette }));
};

const toColorHex = (color: number) => Math.max(0, Math.min(0xffffff, color)).toString(16).toUpperCase().padStart(6, '0');

export const buildPetPurchaseExtraData = (name: string, petType: number, palette: PetPaletteLike, selectedColor: number) => {
    const color = isLegacyPetType(petType) ? selectedColor : 0xffffff;

    return `${name}\n${palette.paletteId}\n${toColorHex(color)}`;
};
