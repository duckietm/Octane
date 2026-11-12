/**
 * The official client's welcome bubbles for a new player (HabboToolbar, `new.user.wing`): one bubble pointing at a
 * toolbar icon shortly after login, and for most wings a second one about the player's own room later on.
 *
 * `new.user.wing` picks the first bubble: `social` points at the navigator, `quest` at the progression icon. The
 * official `group` and `game` wings point at icons this client's toolbar does not have, so they show no first bubble.
 */
export interface NewUserPromo {
    /** The help bubble key of the icon pointed at (UiHelpBubbleIconEnum). */
    anchor: string;
    /** The text key; the official texts are `new.user.promo.<wing>`. */
    textKey: string;
    fallback: string;
}

const FIRST_PROMOS: Record<string, NewUserPromo> = {
    social: { anchor: 'BOTTOM_BAR_NAVIGATOR', textKey: 'new.user.promo.social', fallback: 'Find rooms full of people to meet in the Navigator.' },
    quest: { anchor: 'BOTTOM_BAR_QUESTS', textKey: 'new.user.promo.quest', fallback: 'Your first quests are waiting for you here.' }
};

/** The wings whose players also get the "your own room" bubble. */
const ROOM_PROMO_WINGS = ['social', 'quest', 'group', 'game'];

export const ROOM_PROMO: NewUserPromo = {
    anchor: 'BOTTOM_BAR_NAVIGATOR',
    textKey: 'new.user.promo.room',
    fallback: 'You have a room of your own. Find it under "Me" in the Navigator.'
};

export const firstNewUserPromo = (wing: string): NewUserPromo | null => FIRST_PROMOS[wing] ?? null;

export const hasRoomPromo = (wing: string): boolean => ROOM_PROMO_WINGS.includes(wing);

/** The link that shows a promo as one of this client's own help bubbles. A text with a slash cannot ride in a link. */
export const newUserPromoLink = (promo: NewUserPromo, text: string): string => `helpBubble/hint/${promo.anchor}/${text.replace(/\//g, ' ')}`;
