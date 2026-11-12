import { describe, expect, it } from 'vitest';
import { parseHelpBubbleLink } from './HelpBubbles';
import { firstNewUserPromo, hasRoomPromo, newUserPromoLink, ROOM_PROMO } from './NewUserPromos';

describe('new user welcome bubbles', () => {
    it('points the social wing at the navigator and the quest wing at the progression icon', () => {
        expect(firstNewUserPromo('social')?.anchor).toBe('BOTTOM_BAR_NAVIGATOR');
        expect(firstNewUserPromo('quest')?.anchor).toBe('BOTTOM_BAR_QUESTS');
    });

    it('has no first bubble for a wing without an icon here, or for no wing', () => {
        for (const wing of ['group', 'game', '', 'other']) expect(firstNewUserPromo(wing)).toBeNull();
    });

    it('shows the own-room bubble to the four official wings only', () => {
        for (const wing of ['social', 'quest', 'group', 'game']) expect(hasRoomPromo(wing)).toBe(true);

        expect(hasRoomPromo('')).toBe(false);
    });

    it('raises a promo as a local help bubble, which tells the server nothing when closed', () => {
        const link = parseHelpBubbleLink(newUserPromoLink(ROOM_PROMO, 'Go to Me / My rooms'));

        expect(link).toEqual({ action: 'add', items: [{ name: 'NAVIGATOR', text: 'Go to Me   My rooms', local: true }] });
    });
});
