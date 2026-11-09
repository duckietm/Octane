/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import type { IPurchasableOffer } from '../../../../api';
import * as OfferEditor from './CatalogAdminOfferEditView';

describe('catalog admin offer form state', () => {
    it('recognizes a new offer before effects hydrate its form', () => {
        const isNewOffer = OfferEditor.isCatalogAdminNewOffer;

        expect(isNewOffer({ offerId: -1 } as IPurchasableOffer)).toBe(true);
        expect(isNewOffer({ offerId: 42 } as IPurchasableOffer)).toBe(false);
        expect(isNewOffer(null)).toBe(false);
    });

    it('does not call a missing icon method on the new-offer placeholder', () => {
        const getOfferIconUrl = OfferEditor.getOfferIconUrl;
        const placeholder = {
            offerId: -1,
            product: { productClassId: 0, productType: 'i', productCount: 1, extraParam: '' }
        } as unknown as IPurchasableOffer;

        expect(() => getOfferIconUrl(placeholder)).not.toThrow();
        expect(getOfferIconUrl(placeholder)).toBeNull();
    });

    it('explains session and detail loading states before saving an offer', () => {
        const resolveInteraction = (OfferEditor as any).resolveCatalogAdminOfferInteraction;

        expect(resolveInteraction(false, false, false, null)).toEqual({
            canSave: false,
            message: 'Connecting to Catalog Studio...'
        });
        expect(resolveInteraction(true, false, false, null)).toEqual({
            canSave: false,
            message: 'Loading offer details...'
        });
        expect(resolveInteraction(true, true, false, null)).toEqual({ canSave: true, message: null });
    });

    it('uses the complete authoritative offer response including bundle quantities', () => {
        const createFormState = (OfferEditor as any).createCatalogAdminOfferFormState;
        const state = createFormState({
            offerId: 99,
            pageId: 42,
            itemIds: '100:2;200:5',
            catalogName: 'quantity_bundle',
            costCredits: 25,
            costPoints: 10,
            pointsType: 5,
            amount: 1,
            clubOnly: true,
            extradata: 'extra',
            haveOffer: false,
            offerIdGroup: 77,
            songId: 321,
            limitedStack: 100,
            limitedSells: 12,
            orderNumber: 4,
            catalogMode: 'NORMAL'
        });

        expect(state).toMatchObject({
            offerId: 99,
            pageId: 42,
            itemIds: '100:2;200:5',
            catalogName: 'quantity_bundle',
            costCredits: 25,
            costPoints: 10,
            pointsType: 5,
            amount: 1,
            clubOnly: '1',
            extradata: 'extra',
            haveOffer: '0',
            offerId_group: 77,
            songId: 321,
            limitedStack: 100,
            orderNumber: 4
        });
    });

    it('preserves legacy negative offer ordering', () => {
        const validate = (OfferEditor as any).validateCatalogAdminOfferForm;
        const form = {
            pageId: 42,
            itemIds: '100',
            catalogName: 'legacy_offer',
            costCredits: 1,
            costPoints: 0,
            pointsType: 0,
            amount: 1,
            clubOnly: '0',
            extradata: '',
            haveOffer: '1',
            offerId_group: 0,
            songId: 0,
            limitedStack: 0,
            orderNumber: -1000
        };

        expect(validate(form, false, 0)).toBeNull();
    });

    it('creates a complete new-offer form with the next available order', () => {
        const createNewFormState = (OfferEditor as any).createCatalogAdminNewOfferFormState;

        expect(createNewFormState(42, 8)).toEqual({
            pageId: 42,
            itemIds: '',
            catalogName: '',
            costCredits: 0,
            costPoints: 0,
            pointsType: 0,
            amount: 1,
            clubOnly: '0',
            extradata: '',
            haveOffer: '1',
            offerId_group: -1,
            songId: 0,
            limitedStack: 0,
            orderNumber: 8
        });
    });

    it('validates bundle syntax and limited stock before sending an offer', () => {
        const validate = (OfferEditor as any).validateCatalogAdminOfferForm;
        const valid = {
            pageId: 42,
            itemIds: '100:2;200:5',
            catalogName: 'quantity_bundle',
            costCredits: 25,
            costPoints: 0,
            pointsType: 0,
            amount: 1,
            clubOnly: '0',
            extradata: '',
            haveOffer: '1',
            offerId_group: 0,
            limitedStack: 100,
            orderNumber: 4
        };

        expect(validate(valid, false, 12)).toBeNull();
        expect(validate({ ...valid, itemIds: '100:0' }, false, 12)).toMatch(/item ids/i);
        expect(validate({ ...valid, limitedStack: 5 }, false, 12)).toMatch(/sold/i);
        expect(validate({ ...valid, catalogName: '   ' }, false, 12)).toMatch(/name/i);
    });
});
