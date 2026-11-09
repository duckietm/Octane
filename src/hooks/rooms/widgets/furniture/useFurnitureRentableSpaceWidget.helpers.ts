/**
 * Pure parts of the rentable space widget (AIR RentableSpaceDisplayWidget). The error codes are the
 * ones RentableSpaceStatus / RentableSpaceRentFailed carry (server RentableSpaceInfoComposer).
 */
export const RENTABLE_SPACE_ERROR_TEXTS: ReadonlyMap<number, { key: string; fallback: string }> = new Map([
    [100, { key: 'rentablespace.widget.error_reason_already_rented', fallback: 'This space is already rented.' }],
    [101, { key: 'rentablespace.widget.error_reason_not_rented', fallback: "Sorry, you can't extend the rent of a space that is not rented." }],
    [102, { key: 'rentablespace.widget.error_reason_not_rented_by_you', fallback: "Sorry, you can't extend the rent of a space that is not yours." }],
    [103, { key: 'rentablespace.widget.error_reason_can_rent_only_one_space', fallback: 'You can only rent one space at a time.' }],
    [200, { key: 'rentablespace.widget.error_reason_not_enough_credits', fallback: "You don't have enough credits to rent this space." }],
    [201, { key: 'rentablespace.widget.error_reason_not_enough_duckets', fallback: "You don't have enough duckets to rent this space." }],
    [202, { key: 'rentablespace.widget.error_reason_no_permission', fallback: "You don't have permission to rent this space." }],
    [203, { key: 'rentablespace.widget.error_reason_no_habboclub', fallback: 'You need to be a Habbo Club member to rent a space.' }],
    [300, { key: 'rentablespace.widget.error_reason_disabled', fallback: 'Renting this space is not possible.' }],
    [400, { key: 'rentablespace.widget.error_reason_generic', fallback: 'Renting this space is not possible.' }]
]);

export const RENTABLE_SPACE_NOT_ENOUGH_CREDITS = 200;

export interface RentableSpaceStatus {
    rented: boolean;
    canRent: boolean;
    canRentErrorCode: number;
    renterId: number;
    renterName: string;
    timeRemaining: number;
    price: number;
}

export interface RentableSpaceRentView {
    /** The rent button is clickable. */
    rentEnabled: boolean;
    /** The red line under the button, 0 when hidden. */
    errorCode: number;
}

/**
 * AIR populateRentInfo for a free space: the button is enabled only when the server says the user
 * may rent and the purse covers the price; otherwise the red text shows why (no credits = 200).
 */
export const resolveRentableSpaceRentView = (
    status: Pick<RentableSpaceStatus, 'canRent' | 'canRentErrorCode' | 'price'>,
    credits: number
): RentableSpaceRentView => {
    if (!status.canRent) return { rentEnabled: false, errorCode: status.canRentErrorCode };

    if (status.price > credits) return { rentEnabled: false, errorCode: RENTABLE_SPACE_NOT_ENOUGH_CREDITS };

    return { rentEnabled: true, errorCode: 0 };
};
