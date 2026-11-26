export class UnseenItemCategory {
    public static FURNI: number = 1;
    public static RENTABLE: number = 2;
    public static PET: number = 3;
    public static BADGE: number = 4;
    public static BOT: number = 5;
    public static GAMES: number = 6;
    public static PREFIX: number = 7;
}

/**
 * The categories the inventory icon counts (Volt's INVENTORY_ICON_UNSEEN_CATEGORIES, plus this client's
 * prefixes): only those the inventory window shows and clears. The tracker also holds categories other
 * views own, such as the habbicons (8, the chat habbicon picker) and games (6), which never reach the
 * inventory and so would leave a count on its icon that opening it cannot clear.
 */
export const INVENTORY_ICON_UNSEEN_CATEGORIES: readonly number[] = [
    UnseenItemCategory.FURNI,
    UnseenItemCategory.RENTABLE,
    UnseenItemCategory.PET,
    UnseenItemCategory.BADGE,
    UnseenItemCategory.BOT,
    UnseenItemCategory.PREFIX
];

/** The unseen count the inventory icon shows. */
export const getInventoryIconUnseenCount = (getCount: (category: number) => number): number =>
    INVENTORY_ICON_UNSEEN_CATEGORIES.reduce((total, category) => total + getCount(category), 0);
