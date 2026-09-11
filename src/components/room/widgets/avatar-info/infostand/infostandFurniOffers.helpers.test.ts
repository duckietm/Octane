import { describe, expect, it } from 'vitest';
import { FurniOfferInput, getFurniOfferButtons, isWiredFurniType } from './infostandFurniOffers.helpers';

const base: FurniOfferInput = {
    isOwner: false,
    expiration: -1,
    purchaseOfferId: 10,
    rentOfferId: 20,
    purchaseCouldBeUsedForBuyout: true,
    rentCouldBeUsedForBuyout: true,
    availableForBuildersClub: false
};

describe('getFurniOfferButtons', () => {
    it('offers buy and rent when the viewer does not rent the furni', () => {
        const buttons = getFurniOfferButtons(base, true);

        expect(buttons).toMatchObject({ buy: true, rent: true, extend: false, buyout: false, showExpiration: false });
    });

    it('offers extend and buy-out with the expiration when the viewer rents the furni', () => {
        const buttons = getFurniOfferButtons({ ...base, isOwner: true, expiration: 3600 }, true);

        expect(buttons).toMatchObject({ buy: false, rent: false, extend: true, buyout: true, showExpiration: true });
    });

    it('hides extend and buy-out when the offers cannot be used for them', () => {
        const buttons = getFurniOfferButtons(
            { ...base, isOwner: true, expiration: 3600, rentCouldBeUsedForBuyout: false, purchaseCouldBeUsedForBuyout: false },
            true
        );

        expect(buttons).toMatchObject({ extend: false, buyout: false, showExpiration: true });
    });

    it('offers place more only for Builders Club furni when the config allows it', () => {
        expect(getFurniOfferButtons({ ...base, availableForBuildersClub: true }, true).placeMore).toBe(true);
        expect(getFurniOfferButtons({ ...base, availableForBuildersClub: true }, false).placeMore).toBe(false);
        expect(getFurniOfferButtons(base, true).placeMore).toBe(false);
    });

    it('offers nothing without catalogue offers', () => {
        const buttons = getFurniOfferButtons({ ...base, purchaseOfferId: -1, rentOfferId: -1 }, true);

        expect(buttons).toMatchObject({ buy: false, rent: false, extend: false, buyout: false, placeMore: false });
    });
});

describe('isWiredFurniType', () => {
    it('recognises the wired class name prefix only', () => {
        expect(isWiredFurniType('wf_trg_enter_room')).toBe(true);
        expect(isWiredFurniType('rare_dragonlamp')).toBe(false);
        expect(isWiredFurniType(null)).toBe(false);
    });
});
