import { describe, expect, it } from 'vitest';
import { groupSpacesOffers } from './catalogSpaces.helpers';

const offer = (className: string, productType = 'i', pricingModel = 'pricing_model_single') => ({
    pricingModel,
    product: { productType, furnitureData: { className } }
});

describe('spaces offers (AIR SpacesNewCatalogWidget)', () => {
    it('groups walls, floors and views in AIR tab order and skips anything else', () => {
        const wall = offer('wallpaper');
        const floor = offer('floor');
        const view = offer('landscape');
        const groups = groupSpacesOffers([floor, view, wall, offer('chair', 's'), offer('wallpaper', 'i', 'pricing_model_bundle'), offer('floor', 'e')]);

        expect(groups).toEqual([[wall], [floor], [view]]);
    });
});
