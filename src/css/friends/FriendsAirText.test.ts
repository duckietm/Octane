import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const friendsCss = read('src/css/friends/FriendsView.css');
const requestsCss = read('src/css/friends/FriendBarRequests.css');
const activityCss = read('src/css/friends/FriendBarActivity.css');
const messengerCss = read('src/components/friends/views/messenger/FriendsMessengerView.css');
const inviteView = read('src/components/friends/views/friends-list/FriendsListRoomInviteView.tsx');
const removeView = read('src/components/friends/views/friends-list/FriendsListRemoveConfirmationView.tsx');

describe('friend windows text (habbo-friend-bar / habbo-friend-list / messenger layouts)', () => {
    it('draws the friend bar in regular Ubuntu with u_bold 12 names', () => {
        expect(friendsCss).toMatch(/\.friend-bar :where\(\*\):not\(svg, svg \*\),[^{]*\{[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif !important/);
        expect(friendsCss).toMatch(/\.friend-bar :where\(\.friend-bar-text, \.friend-bar-actions-name\) \{[^}]*font-size: 12px !important;[^}]*font-weight: 700 !important/);
        expect(friendsCss).toMatch(/\.friend-bar \.friend-bar-find-friends-copy \{[^}]*color: #000;/);
    });

    it('gives the find friends button the grey shiny thick skin', () => {
        expect(friendsCss).toMatch(/\.friend-bar \.friend-bar-find-friends \.friend-bar-find-friends-button \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick\)/);
    });

    it('sizes the friend request bubble like friend_requests_tab', () => {
        expect(requestsCss).toMatch(/\.friend-bar-requests-counter \{[^}]*font-size: 12px;/);
        expect(requestsCss).toMatch(/\.friend-bar-requests-bubble \.friend-bar-requests-link \{[^}]*font-size: 10px;[^}]*font-weight: 400;/);
        expect(requestsCss).toMatch(/\.friend-bar-requests-footer \.friend-bar-requests-link \{[^}]*font-size: 11px;[^}]*font-weight: 700;/);
        expect(requestsCss).toMatch(/\.friend-bar-requests-shiny\.is-small \{[^}]*font-size: 12px;[^}]*font-weight: 400;/);
    });

    it('draws the style 0 invite and remove dialogs in Volter 9 with grey buttons', () => {
        expect(friendsCss).toMatch(/\.octane-friends-remove-confirmation \.octane-card-content-shell :where\(\*\):not\(svg, svg \*\) \{[^}]*Volter, monospace !important/);
        expect(friendsCss).toMatch(/\.octane-friends-room-invite-summary \{[^}]*color: #000;[^}]*font-size: 9px;[^}]*font-weight: 400;/);
        expect(friendsCss).toMatch(/:where\(\.habbo-btn-secondary\) \{[^}]*font-size: 9px !important;/);
        expect(inviteView).not.toContain('variant="success"');
        expect(inviteView.match(/variant="secondary"/g)?.length).toBe(2);
        expect(removeView).toMatch(/octane-friends-remove-confirmation-ok" variant="secondary"/);
    });

    it('gives the category manager regular Ubuntu and grey thick buttons', () => {
        expect(friendsCss).toMatch(/\.octane-friends-category-manager \.octane-card-content-shell :where\(\*\):not\(svg, svg \*\)/);
        expect(friendsCss).toMatch(/\.octane-friends-category-manager \.octane-card-content-shell \.habbo-btn-primary \{[^}]*--habbo-skin-shiny-thick\)[^}]*color: #000 !important;/);
    });

    it('draws the epic popup close button as an il_button and the habbicon sections as il_regular', () => {
        expect(activityCss).toMatch(/\.octane-epic-popup-content \{[^}]*HabboAirUbuntu, UbuntuRegular/);
        expect(activityCss).toMatch(/\.octane-epic-popup-close \{[^}]*font-size: 10px;[^}]*font-weight: 700;/);
        expect(messengerCss).toMatch(/\.messenger-habbicon-scroll strong \{[^}]*font-size: 11px;/);
    });

    it('tints the requests button_accept_all 0x77bf43 on the shiny thick skin as AIR', () => {
        expect(requestsCss).toMatch(
            /\.friend-bar-requests-accept-all \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick-tint-77bf43\);[^}]*background: transparent;[^}]*color: #fff;/
        );
        expect(requestsCss).toMatch(/\.friend-bar-requests-accept-all:hover \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-77bf43-hover\)/);
        expect(requestsCss).not.toMatch(/\.friend-bar-requests-accept-all \{[^}]*linear-gradient/);
    });
});
