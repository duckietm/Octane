import { FurniCategory } from '../../../../api';

// AIR 13 merges rented furni into the furni tab (HabboInventory.mergeRentFurni is hard-wired to
// true, so the `rentables` tab is never added to the inventory). The rent state only shows up as
// the `rent_state` overlay on the thumb (GroupItem.updateRentStateVisual), the rent text in
// `furni_extra` (FurniView.updateRentedItem) and the extend / buy-out / go-to-room buttons of the
// preview pane (FurniView.updateActionButtons).

export const RENT_WARNING_DURATION_DEFAULT_SECONDS = 172800;

export type InventoryRentState = 'not_started' | 'started' | 'ending';

export interface RentStateInput {
    isRented: boolean;
    hasRentPeriodStarted: boolean;
    secondsToExpiration: number;
}

/**
 * GroupItem.updateRentStateVisual: `inventory_thumb_rent_not_started` before the rent period
 * runs, `inventory_thumb_rent_ending` under `purchase.rent.warning_duration_seconds` (48 h),
 * `inventory_thumb_rent_started` otherwise. Nothing for furni that is not rented.
 */
export const getInventoryRentState = (
    item: RentStateInput | null,
    warningSeconds: number = RENT_WARNING_DURATION_DEFAULT_SECONDS
): InventoryRentState | null => {
    if (!item || !item.isRented) return null;

    if (!item.hasRentPeriodStarted) return 'not_started';

    return item.secondsToExpiration < warningSeconds ? 'ending' : 'started';
};

/**
 * FurniView.updateRentedItem: a running rent prints `inventory.rent.expiration`, a rent that has
 * not started yet prints `inventory.rent.inactive`; both take the friendly time in %time%.
 */
export const getInventoryRentTextKey = (item: RentStateInput | null): 'inventory.rent.expiration' | 'inventory.rent.inactive' | null => {
    if (!item || !item.isRented) return null;

    return item.hasRentPeriodStarted ? 'inventory.rent.expiration' : 'inventory.rent.inactive';
};

export interface PreviewButtonsInput {
    isRented: boolean;
    flatId: number;
    category: number;
    sellable: boolean;
    isTrading: boolean;
    inPrivateRoom: boolean;
    rentCouldBeUsedForBuyout: boolean;
    purchaseCouldBeUsedForBuyout: boolean;
}

export interface PreviewButtons {
    place: boolean;
    extend: boolean;
    buyout: boolean;
    gotoRoom: boolean;
    use: boolean;
    sell: boolean;
}

const USE_PRODUCT_CATEGORIES = [
    FurniCategory.PET_SHAMPOO,
    FurniCategory.PET_CUSTOM_PART,
    FurniCategory.PET_CUSTOM_PART_SHAMPOO,
    FurniCategory.PET_SADDLE,
    FurniCategory.MONSTERPLANT_REVIVAL
];

/**
 * FurniView.updateActionButtons (AIR 13 FurniView.as:545-552). A rented furni that already sits
 * in a room (flatId > -1) can neither be placed nor extended / bought out from the inventory:
 * it only offers the way to that room.
 */
export const getInventoryPreviewButtons = (input: PreviewButtonsInput): PreviewButtons => {
    const canPlace = !(input.isRented && input.flatId > -1);

    return {
        place: !input.isTrading && canPlace,
        extend: !input.isTrading && input.isRented && canPlace && input.rentCouldBeUsedForBuyout,
        buyout: !input.isTrading && input.isRented && canPlace && input.purchaseCouldBeUsedForBuyout,
        gotoRoom: !input.isTrading && input.flatId > -1,
        use: input.inPrivateRoom && USE_PRODUCT_CATEGORIES.indexOf(input.category) >= 0,
        sell: !input.isTrading && input.sellable
    };
};
