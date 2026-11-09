/**
 * Pure rules of AIR's ui/widget/uihelpbubbles (UiHelpBubblesWidget, UiHelpBubble,
 * UiHelpBubbleIconEnum): the `helpBubble/add/<KEY>/<text>[/<KEY>/<text>...]` and
 * `helpBubble/remove/<KEY>` links, the element each key points at and where the bubble goes.
 */

/** UiHelpBubbleIconEnum: the server names a key, the client looks the element up by its value. */
export const HELP_BUBBLE_ICON_ENUM: Record<string, string> = {
    FRIENDS_BAR_ALL_FRIENDS: 'icon_all_friends',
    FRIENDS_BAR_FIND_FRIENDS: 'icon_find_friends',
    BOTTOM_BAR_BUILDERS_CLUB: 'BUILDER',
    BOTTOM_BAR_HOME: 'HOME',
    BOTTOM_BAR_RECEPTION: 'RECEPTION',
    BOTTOM_BAR_NAVIGATOR: 'NAVIGATOR',
    BOTTOM_BAR_CATALOGUE: 'CATALOGUE',
    BOTTOM_BAR_INVENTORY: 'INVENTORY',
    BOTTOM_BAR_STORIES: 'STORIES',
    BOTTOM_BAR_MEMENU: 'MEMENU',
    BOTTOM_BAR_QUESTS: 'PROGRESSION',
    MEMENU_ACHIEVEMENTS: 'achievements',
    MEMENU_CLOTHES: 'clothes',
    MEMENU_FORUMS: 'forums',
    MEMENU_TALENTS: 'talents',
    MEMENU_GUIDE: 'guide',
    MEMENU_MAIL: 'mail',
    MEMENU_PROFILE: 'profile',
    MEMENU_ROOMS: 'rooms',
    CHAT_INPUT: 'chat_input',
    HC_JOIN_BUTTON: 'hc_join_button',
    HELP_BUTTON: 'help_button',
    SETTINGS_BUTTON: 'settings_button',
    CREDITS_BUTTON: 'credit_count_button',
    DUCKETS_BUTTON: 'ducket_count_button',
    DIAMONDS_BUTTON: 'diamond_count_button',
    LOGOUT_BUTTON: 'logout_button',
    ROOM_HISTORY_BACK_BUTTON: 'button_history_back',
    ROOM_HISTORY_FORWARD_BUTTON: 'button_history_back',
    ROOM_HISTORY_BUTTON: 'button_history',
    CHAT_HISTORY_BUTTON: 'button_chat_history',
    LIKE_ROOM_BUTTON: 'button_like',
    CAMERA_BUTTON: 'button_camera'
};

/**
 * Where each AIR element lives in this client: the toolbar icons, the purse, the room tools and
 * the chat input. The first visible match is used.
 */
export const HELP_BUBBLE_ANCHORS: Record<string, string[]> = {
    icon_all_friends: ['.icon-friendall'],
    icon_find_friends: ['.icon-friendsearch'],
    BUILDER: ['.icon-buildersclub'],
    HOME: ['.icon-house'],
    RECEPTION: ['.icon-habbo', '.icon-house'],
    NAVIGATOR: ['.icon-rooms'],
    CATALOGUE: ['.icon-catalog'],
    INVENTORY: ['.icon-inventory'],
    STORIES: ['.icon-stories'],
    MEMENU: ['.tb-memenu-avatar'],
    PROGRESSION: ['.icon-progression'],
    achievements: ['.icon-me-achievements'],
    clothes: ['.icon-me-clothing'],
    forums: ['.icon-me-forums'],
    talents: ['.icon-me-talents'],
    guide: ['.icon-me-helper-tool'],
    profile: ['.icon-me-profile'],
    rooms: ['.icon-me-rooms'],
    chat_input: ['.swf-chat-input', '#toolbar-chat-input-container'],
    hc_join_button: ['.octane-purse__btn--join'],
    help_button: ['.octane-purse__btn--help'],
    settings_button: ['.octane-purse__btn--settings'],
    credit_count_button: ['.currency--1'],
    ducket_count_button: ['.currency-0'],
    diamond_count_button: ['.currency-5'],
    logout_button: ['.octane-purse__btn--logout'],
    button_history_back: ['.icon-room-history-back-enabled', '.icon-room-history-back-disabled'],
    button_history: ['.icon-room-history-enabled', '.icon-room-history-disabled'],
    button_chat_history: ['.room-tool-row:has(.icon-chat-history)', '.icon-chat-history'],
    button_like: ['.room-tool-row:has(.icon-like-room)', '.icon-like-room'],
    button_camera: ['.icon-camera']
};

export interface IHelpBubbleItem {
    /** The element value (UiHelpBubbleIconEnum value, or the raw key when the enum has none). */
    name: string;
    /** The text, or the localization key that holds it. */
    text: string;
}

export type HelpBubbleLink = { action: 'add'; items: IHelpBubbleItem[] } | { action: 'remove'; name: string } | null;

export const resolveHelpBubbleName = (key: string): string => HELP_BUBBLE_ICON_ENUM[key] ?? key;

/** UiHelpBubblesWidget.linkReceived: `add` takes key/text pairs, `remove` one key. */
export const parseHelpBubbleLink = (link: string): HelpBubbleLink => {
    const parts = (link ?? '').split('/');

    if (parts.length < 3) return null;

    if (parts[1] === 'add') {
        const items: IHelpBubbleItem[] = [];

        for (let index = 2; index + 1 < parts.length; index += 2) {
            items.push({ name: resolveHelpBubbleName(parts[index]), text: parts[index + 1] });
        }

        return items.length ? { action: 'add', items } : null;
    }

    if (parts[1] === 'remove') return { action: 'remove', name: resolveHelpBubbleName(parts[2] ?? '') };

    return null;
};

export interface IHelpBubbleRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface IHelpBubblePlacement {
    x: number;
    y: number;
    /** 'down': the bubble sits above its element and points down; 'up': below, pointing up. */
    direction: 'up' | 'down';
    /** The arrow's distance from the bubble's left edge. */
    arrowX: number;
}

const BUBBLE_GAP = 15;
const TOP_MARGIN = 50;
const SIDE_MARGIN = 10;

/**
 * UiHelpBubblesWidget._r7832e78f936393: the bubble goes above its element (15 px gap, none when
 * the top of the desktop is near) and below it when there is no room above; horizontally it is
 * centred on the element and kept on the desktop, the arrow still pointing at the element.
 */
export const placeHelpBubble = (anchor: IHelpBubbleRect, bubbleWidth: number, bubbleHeight: number, desktopWidth: number): IHelpBubblePlacement => {
    const center = anchor.x + anchor.width / 2;
    let gap = BUBBLE_GAP;

    if (anchor.y - (bubbleHeight + gap) < TOP_MARGIN) gap = 0;

    let y = anchor.y - bubbleHeight - gap;
    let direction: 'up' | 'down' = 'down';

    if (y < TOP_MARGIN) {
        y = anchor.y + anchor.height + 10;
        direction = 'up';
    }

    const maxX = Math.max(SIDE_MARGIN, desktopWidth - bubbleWidth - SIDE_MARGIN);
    const x = Math.min(maxX, Math.max(SIDE_MARGIN, center - bubbleWidth / 2));
    const arrowX = Math.min(bubbleWidth - 20, Math.max(20, center - x));

    return { x, y, direction, arrowX };
};

/** UiHelpBubble: a bubble followed by another keeps "OK" and moves on; the last one closes. */
export const isLastHelpBubble = (queueLength: number, index: number): boolean => index >= queueLength - 1;
