import { describe, expect, it } from 'vitest';
import {
    buildNewPetPaletteChoices,
    buildPetPurchaseExtraData,
    filterPetPalettes,
    getPetNameMaxLength,
    isLegacyPetType
} from './petCatalog.helpers';

const palette = (type: number, paletteId: number, sellable = true, breedId = paletteId) => ({
    breedId,
    paletteId,
    rare: false,
    sellable,
    type
});

describe('pet catalog rules', () => {
    it('uses the legacy editor only for pet types zero through seven', () => {
        expect(isLegacyPetType(0)).toBe(true);
        expect(isLegacyPetType(7)).toBe(true);
        expect(isLegacyPetType(8)).toBe(false);
    });

    it('uses the correct name length for each pet editor', () => {
        expect(getPetNameMaxLength(7)).toBe(15);
        expect(getPetNameMaxLength(8)).toBe(16);
    });

    it('keeps only sellable palettes belonging to the selected pet type', () => {
        const result = filterPetPalettes(8, [palette(7, 1), palette(8, 2, false), palette(8, 3)]);

        expect(result.map((entry) => entry.paletteId)).toEqual([3]);
    });

    it('keeps new-pet colors paired with their source palette and caps the grid at twenty', () => {
        const palettes = Array.from({ length: 23 }, (_, index) => palette(8, index + 1));
        const result = buildNewPetPaletteChoices(8, palettes, (_type, paletteId) => {
            if (paletteId === 2) return null;

            return { primaryColor: paletteId, secondaryColor: paletteId + 100 };
        });

        expect(result).toHaveLength(20);
        expect(result[0]).toMatchObject({ palette: { paletteId: 1 }, colors: [1, 101] });
        expect(result[1]).toMatchObject({ palette: { paletteId: 3 }, colors: [3, 103] });
        expect(result.at(-1)).toMatchObject({ palette: { paletteId: 21 } });
    });

    it('uses the selected legacy color in the purchase payload', () => {
        expect(buildPetPurchaseExtraData('Buddy', 7, palette(7, 42), 0xabcdef)).toBe('Buddy\n42\nABCDEF');
    });

    it('uses the fixed purchase color for new pets', () => {
        expect(buildPetPurchaseExtraData('Nova', 8, palette(8, 77), 0x123456)).toBe('Nova\n77\nFFFFFF');
    });
});
