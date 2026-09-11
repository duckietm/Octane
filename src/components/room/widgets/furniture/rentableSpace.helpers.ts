/**
 * Pure decisions of the official rentable space widget
 * (RentableSpaceDisplayWidget.as, layout `rentablespace`): which of the three
 * views to show and which error text, from the RentableSpaceStatus packet and
 * the viewer's credits.
 */

export const RENTABLE_SPACE_NOT_ENOUGH_CREDITS = 200;
export const RENTABLE_SPACE_GENERIC_ERROR = 400;

export const RENTABLE_SPACE_ERROR_KEYS: Readonly<Record<number, string>> = {
    100: 'rentablespace.widget.error_reason_already_rented',
    101: 'rentablespace.widget.error_reason_not_rented',
    102: 'rentablespace.widget.error_reason_not_rented_by_you',
    103: 'rentablespace.widget.error_reason_can_rent_only_one_space',
    200: 'rentablespace.widget.error_reason_not_enough_credits',
    201: 'rentablespace.widget.error_reason_not_enough_duckets',
    202: 'rentablespace.widget.error_reason_no_permission',
    203: 'rentablespace.widget.error_reason_no_habboclub',
    300: 'rentablespace.widget.error_reason_disabled',
    400: 'rentablespace.widget.error_reason_generic'
};

export interface RentableSpaceStatus {
    rented: boolean;
    canRent: boolean;
    canRentErrorCode: number;
    renterId: number;
    renterName: string;
    timeRemaining: number;
    price: number;
}

export type RentableSpaceViewState =
    | { mode: 'rented'; renterName: string; timeRemaining: number }
    | { mode: 'rent'; price: number; canRent: boolean; errorKey: string | null }
    | { mode: 'error'; errorKey: string };

export const getRentableSpaceErrorKey = (code: number): string => RENTABLE_SPACE_ERROR_KEYS[code] ?? RENTABLE_SPACE_ERROR_KEYS[RENTABLE_SPACE_GENERIC_ERROR];

/** The official price label: "<price> x" followed by the credit icon. */
export const formatRentableSpacePrice = (price: number): string => `${Math.max(0, Math.floor(price))} x`;

/**
 * Mirrors populateRentInfo / showErrorView: a failed rent shows the error
 * view, a rented space the renter and the time left, otherwise the rent view
 * whose button is enabled only when the server allows it and the viewer can
 * pay.
 */
export const resolveRentableSpaceView = (status: RentableSpaceStatus | null, rentErrorCode: number, credits: number): RentableSpaceViewState | null => {
    if (rentErrorCode > 0) return { mode: 'error', errorKey: getRentableSpaceErrorKey(rentErrorCode) };

    if (!status) return null;

    if (status.rented) return { mode: 'rented', renterName: status.renterName, timeRemaining: Math.max(0, status.timeRemaining) };

    if (!status.canRent) return { mode: 'rent', price: status.price, canRent: false, errorKey: getRentableSpaceErrorKey(status.canRentErrorCode) };

    if (status.price > credits)
        return { mode: 'rent', price: status.price, canRent: false, errorKey: getRentableSpaceErrorKey(RENTABLE_SPACE_NOT_ENOUGH_CREDITS) };

    return { mode: 'rent', price: status.price, canRent: true, errorKey: null };
};
