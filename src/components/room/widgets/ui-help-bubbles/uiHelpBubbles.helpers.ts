/**
 * Pure pieces of the official `UiHelpBubblesWidget` (AIR 13, `ui/widget/uihelpbubbles`): the
 * `helpBubble/` link protocol, the icon enum and the bubble placement rules.
 */

export const HELP_BUBBLE_LINK_PREFIX = 'helpBubble/';

// Official layout: `ui_help_bubble` is 180 wide, the bubble sits 15px above its element.
export const HELP_BUBBLE_WIDTH = 180;
export const HELP_BUBBLE_GAP = 15;
export const HELP_BUBBLE_TOP_MARGIN = 50;

export interface HelpBubbleItem {
    name: string;
    textKey: string;
}

/**
 * `UiHelpBubbleIconEnum`: the link may name an element by the enum constant or by the raw
 * element id; both resolve to the id the anchors carry (`data-help-bubble`).
 */
export const UI_HELP_BUBBLE_ICON_NAMES: Readonly<Record<string, string>> = Object.freeze({
    FRIENDS_BAR_ALL_FRIENDS: 'icon_all_friends',
    FRIENDS_BAR_FIND_FRIENDS: 'icon_find_friends',
    BOTTOM_BAR_BUILDERS_CLUB: 'HTIE_ICON_BUILDER',
    BOTTOM_BAR_HOME: 'HTIE_ICON_HOME',
    BOTTOM_BAR_RECEPTION: 'HTIE_ICON_RECEPTION',
    BOTTOM_BAR_NAVIGATOR: 'HTIE_ICON_NAVIGATOR',
    BOTTOM_BAR_CATALOGUE: 'HTIE_ICON_CATALOGUE',
    BOTTOM_BAR_INVENTORY: 'HTIE_ICON_INVENTORY',
    BOTTOM_BAR_STORIES: 'HTIE_ICON_STORIES',
    BOTTOM_BAR_MEMENU: 'HTIE_ICON_MEMENU',
    BOTTOM_BAR_QUESTS: 'HTIE_ICON_PROGRESSION',
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
    ROOM_HISTORY_FORWARD_BUTTON: 'button_history_forward',
    ROOM_HISTORY_BUTTON: 'button_history',
    CHAT_HISTORY_BUTTON: 'button_chat_history',
    LIKE_ROOM_BUTTON: 'button_like',
    CAMERA_BUTTON: 'button_camera'
});

export const resolveHelpBubbleElementName = (name: string): string => UI_HELP_BUBBLE_ICON_NAMES[name] ?? name;

export type HelpBubbleLinkCommand = { type: 'add'; items: HelpBubbleItem[] } | { type: 'remove'; name: string } | null;

/**
 * `UiHelpBubblesWidget.linkReceived`: `helpBubble/add/<name>/<textKey>[/<name>/<textKey>...]`
 * queues bubbles in pairs, `helpBubble/remove/<name>` drops one. Fewer than three parts is ignored.
 */
export const parseHelpBubbleLink = (url: string): HelpBubbleLinkCommand => {
    const parts = url.split('/');

    if (parts.length < 3) return null;

    if (parts[1] === 'add') {
        const items: HelpBubbleItem[] = [];

        for (let index = 2; index + 1 < parts.length; index += 2) {
            items.push({ name: resolveHelpBubbleElementName(parts[index]), textKey: parts[index + 1] });
        }

        return { type: 'add', items };
    }

    if (parts[1] === 'remove') return { type: 'remove', name: resolveHelpBubbleElementName(parts[2]) };

    return null;
};

export interface HelpBubbleRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface HelpBubblePlacement {
    // Left edge of the bubble.
    left: number;
    top: number;
    direction: 'up' | 'down';
    // Arrow offset from the bubble's horizontal centre, in px.
    arrowOffset: number;
}

/**
 * `UiHelpBubblesWidget.checkElementPosition`: the bubble hangs above the element, centred on it
 * (arrow pointing down); when that would leave the top of the screen it drops below the element
 * (arrow up); a bubble running off either side is pushed back and the arrow shifted to keep
 * pointing at the element.
 */
export const placeHelpBubble = (
    anchor: HelpBubbleRect,
    bubbleHeight: number,
    desktopWidth: number,
    bubbleWidth: number = HELP_BUBBLE_WIDTH
): HelpBubblePlacement => {
    let gap = HELP_BUBBLE_GAP;

    if (anchor.y - (bubbleHeight + gap) < HELP_BUBBLE_TOP_MARGIN) gap = 0;

    let centerX = anchor.x + anchor.width / 2;
    let top = anchor.y - (bubbleHeight + gap);
    let direction: HelpBubblePlacement['direction'] = 'down';
    let arrowOffset = 0;

    if (top < bubbleHeight) {
        top = anchor.y + anchor.height + 10;
        direction = 'up';
    }

    if (centerX < bubbleWidth / 2) {
        arrowOffset = centerX - bubbleWidth / 2 - 10;
        centerX = bubbleWidth / 2 + 10;
    } else if (centerX + bubbleWidth / 2 > desktopWidth) {
        arrowOffset = centerX - (desktopWidth - bubbleWidth / 2);
        centerX = desktopWidth - bubbleWidth / 2;
    }

    return { left: Math.round(centerX - bubbleWidth / 2), top: Math.round(top), direction, arrowOffset: Math.round(arrowOffset) };
};

/**
 * `UiHelpBubble.setModal`: the modal covers the desktop except the element's rectangle. The four
 * strips around the hole let the element itself stay clickable.
 */
export const getHelpBubbleModalStrips = (anchor: HelpBubbleRect, desktopWidth: number, desktopHeight: number): HelpBubbleRect[] => {
    const right = anchor.x + anchor.width;
    const bottom = anchor.y + anchor.height;

    return [
        { x: 0, y: 0, width: desktopWidth, height: Math.max(0, anchor.y) },
        { x: 0, y: bottom, width: desktopWidth, height: Math.max(0, desktopHeight - bottom) },
        { x: 0, y: anchor.y, width: Math.max(0, anchor.x), height: anchor.height },
        { x: right, y: anchor.y, width: Math.max(0, desktopWidth - right), height: anchor.height }
    ];
};
