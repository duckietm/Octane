export type NavigatorHoverItemId = 'navigator' | 'home' | 'favorites' | 'create' | 'history' | 'frequent';

export interface NavigatorHoverItem {
    id: NavigatorHoverItemId;
    key: string;
    fallback: string;
    /** Rows that need data the client does not have yet stay visible but inert, like the official home row. */
    disabled: boolean;
    /** Rows that unfold a room list instead of opening a window. */
    expandable: boolean;
}

export interface NavigatorHoverInput {
    homeRoomId: number;
    historyCount: number;
}

// The official hover menu closes half a second after the pointer leaves it
// (ToolbarHoverCtrl.as, _hideTimeout = Timer(500, 1)).
export const NAVIGATOR_HOVER_HIDE_DELAY_MS = 500;
// With a room list unfolded the menu is being used, so it waits much longer
// and otherwise closes on a click elsewhere.
export const NAVIGATOR_HOVER_HIDE_DELAY_EXPANDED_MS = 2000;

/**
 * The six rows of the official toolbar hover menu, in XML order
 * (3075_toolbar_hover_xml): navigator, home, favourites, create,
 * visited rooms, frequent visits.
 */
export const buildNavigatorHoverItems = (input: NavigatorHoverInput): NavigatorHoverItem[] => {
    const hasHistory = input.historyCount > 0;

    return [
        { id: 'navigator', key: 'navigator.title', fallback: 'Navigator', disabled: false, expandable: false },
        { id: 'home', key: 'toolbar.icon.label.exitroom.home', fallback: 'Home room', disabled: !(input.homeRoomId > 0), expandable: false },
        { id: 'favorites', key: 'navigator.navisel.myfavourites', fallback: 'My favorite rooms', disabled: false, expandable: false },
        { id: 'create', key: 'navigator.createroom.create', fallback: 'Create room', disabled: false, expandable: false },
        { id: 'history', key: 'navigator.navisel.visitedrooms', fallback: "Rooms I've recently visited", disabled: !hasHistory, expandable: true },
        { id: 'frequent', key: 'navigator.navisel.frequentvisits', fallback: 'Frequently Visited Rooms', disabled: !hasHistory, expandable: true }
    ];
};

/**
 * The link event each row fires. The official favourites / history /
 * frequent rows call showFavouriteRooms / showHistoryRooms /
 * showFrequentRooms, which open the navigator on the "me" tab with the
 * `favorites` / `history` / `history_freq` search block selected
 * (LegacyNavigator.as performSearch). The emulator has no `history` block:
 * it serves the last three days of visits, newest first, as `history_freq`,
 * so both history rows land on that block.
 */
export const NAVIGATOR_HOVER_LINKS: Record<NavigatorHoverItemId, string> = {
    navigator: 'navigator/show',
    home: 'navigator/goto/home',
    favorites: 'navigator/me/favorites',
    create: 'navigator/create',
    history: 'navigator/me/history_freq',
    frequent: 'navigator/me/history_freq'
};
