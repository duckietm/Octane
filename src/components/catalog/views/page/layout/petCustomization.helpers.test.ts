/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { FurniCategory } from '../../../../../api';
import { buildPetCustomizationPreviewFigure } from './petCustomization.helpers';

describe('standard pet customization catalog preview', () => {
    it('builds a complete default-pet figure for saddle custom parts', () => {
        const furniture = {
            specialType: FurniCategory.PET_SADDLE,
            customParams: '15 1,2 3,4 5,6'
        } as any;

        expect(buildPetCustomizationPreviewFigure(furniture)).toBe('15 2 16777215 2 1 3 5 2 4 6');
    });

    it('builds palette-only previews for shampoo offers', () => {
        const furniture = {
            specialType: FurniCategory.PET_SHAMPOO,
            customParams: '15 hair'
        } as any;

        expect(buildPetCustomizationPreviewFigure(furniture)).toBe('15 2 16777215 0');
    });

    it('rejects malformed customization parameters instead of rendering a broken pet', () => {
        expect(buildPetCustomizationPreviewFigure({ specialType: FurniCategory.PET_SADDLE, customParams: '15 1,2' } as any)).toBeNull();
    });
});
