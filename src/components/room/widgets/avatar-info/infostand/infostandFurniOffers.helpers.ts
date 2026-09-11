export interface FurniOfferInput {
    isOwner: boolean;
    expiration: number;
    purchaseOfferId: number;
    rentOfferId: number;
    purchaseCouldBeUsedForBuyout: boolean;
    rentCouldBeUsedForBuyout: boolean;
    availableForBuildersClub: boolean;
}

export interface FurniOfferButtons {
    buy: boolean;
    rent: boolean;
    extend: boolean;
    buyout: boolean;
    placeMore: boolean;
    showExpiration: boolean;
}

/**
 * Mirrors InfoStandFurniView.as updatePurchaseButtonVisibility: a furni
 * the viewer rents (owner with an expiration) offers extend / buy-out,
 * anything else offers buy / rent from the catalogue offers the server
 * attached to the furni. "Place more" is the Builders' Club shortcut and
 * follows the `infostand.place_more.enabled` config like the official
 * client.
 */
export const getFurniOfferButtons = (input: FurniOfferInput, placeMoreEnabled: boolean): FurniOfferButtons => {
    const rentedByViewer = input.isOwner && input.expiration >= 0;

    return {
        buy: !rentedByViewer && input.purchaseOfferId > 0,
        rent: !rentedByViewer && input.rentOfferId > 0,
        extend: rentedByViewer && input.rentCouldBeUsedForBuyout && input.rentOfferId > 0,
        buyout: rentedByViewer && input.purchaseCouldBeUsedForBuyout && input.purchaseOfferId > 0,
        placeMore: placeMoreEnabled && input.availableForBuildersClub && input.purchaseOfferId > 0,
        showExpiration: rentedByViewer
    };
};

// Wired furni share the `wf_` class name prefix; the inspect button is
// only offered for them, the rest of the infostand stays unchanged.
export const isWiredFurniType = (type: string | null | undefined): boolean => typeof type === 'string' && type.startsWith('wf_');
