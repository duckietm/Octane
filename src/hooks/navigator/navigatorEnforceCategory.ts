/**
 * Official "enforce category" flow (navigator/roomsettings/EnforceCategoryCtrl):
 * the server pushes RoomCategorySelectionEnforcement (header 3896,
 * `ShowEnforceRoomCategoryDialogEvent` on our side) when a room sits in a
 * category it can no longer use — typically right after the room was created
 * or its settings were saved. The client opens a modal with no close button,
 * lists the categories the user may pick, the three trade modes, and on OK
 * sends UpdateRoomCategoryAndTradeSettings(roomId, categoryId, tradeMode).
 *
 * Everything decision-shaped lives here so it can be unit-tested without the
 * renderer.
 */

export interface EnforceableCategory {
    id: number;
    name: string;
    visible: boolean;
    automatic: boolean;
    staffOnly: boolean;
}

/** SecurityLevel the official checks with `sessionData.hasSecurity(7)`. */
export const ENFORCE_CATEGORY_STAFF_SECURITY_LEVEL = 7;

/** Same order as the official drop menu (index == trade mode sent). */
export const ENFORCE_CATEGORY_TRADE_KEYS = [
    'navigator.roomsettings.trade_not_allowed',
    'navigator.roomsettings.trade_not_with_Controller',
    'navigator.roomsettings.trade_allowed'
] as const;

/** Official: 5 = the "my rooms" list; only that list reloads after a save. */
export const MY_ROOMS_SEARCH_CODE = 'myworld_view';

/**
 * EnforceCategoryCtrl.show: visible categories that are not automatic and
 * either not staff-only or shown to staff.
 */
export const getEnforceableCategories = <T extends EnforceableCategory>(categories: readonly T[] | null | undefined, securityLevel: number): T[] =>
    (categories || []).filter(
        (category) => !!category && category.visible && !category.automatic && (!category.staffOnly || securityLevel >= ENFORCE_CATEGORY_STAFF_SECURITY_LEVEL)
    );

export interface EnforceCategoryUpdate {
    roomId: number;
    categoryId: number;
    tradeMode: number;
}

/**
 * Builds the UpdateRoomCategoryAndTradeSettings payload the OK button sends.
 * Returns null when nothing sensible can be sent (no room, no categories).
 */
export const buildEnforceCategoryUpdate = (
    roomId: number,
    categories: readonly EnforceableCategory[],
    categoryIndex: number,
    tradeIndex: number
): EnforceCategoryUpdate | null => {
    if (!Number.isInteger(roomId) || roomId <= 0 || !categories.length) return null;

    const category = categories[Math.min(Math.max(0, categoryIndex), categories.length - 1)];
    const tradeMode = Math.min(Math.max(0, tradeIndex), ENFORCE_CATEGORY_TRADE_KEYS.length - 1);

    return { roomId, categoryId: category.id, tradeMode };
};

/**
 * Official onRoomSettingsSaved -> mainViewCtrl.reloadRoomList(5): the list is
 * refetched only while the navigator is open on the "my rooms" search; any
 * other search keeps its result.
 */
export const shouldReloadRoomListAfterSettingsSaved = (isNavigatorVisible: boolean, currentSearchCode: string | null | undefined): boolean =>
    !!isNavigatorVisible && currentSearchCode === MY_ROOMS_SEARCH_CODE;
