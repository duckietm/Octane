import { describe, expect, it } from 'vitest';
import { getAirLinkAction, translateAirLink } from './AirLinkAliases';

const CASES: [string, string][] = [
    ['avatareditor/open', 'avatar-editor/show'],
    ['friendlist/open', 'friends/show'],
    ['messenger/42', 'friends-messenger/42'],
    ['discord/settings/open', 'discord-settings/show'],
    ['badge_leaderboard/', 'badge-leaderboard/show'],
    ['badge_leaderboard/1/-1/0', 'badge-leaderboard/show/1/-1/0'],
    ['badge_leaderboard/2', 'badge-leaderboard/show/2'],
    ['badge_leaderboard/x/1', 'badge-leaderboard/show'],
    ['wiredrewards/open/7', 'wiredchestreward/open/7'],
    ['camera/open', 'camera/show'],
    ['inventory/open', 'inventory/show'],
    ['inventory/open/badges', 'inventory/show/badges'],
    ['inventory/open/furni/123', 'inventory/show/furni/123'],
    ['catalog/warehouse', 'catalog/show/bc'],
    ['catalog/warehouse/some_page', 'catalog/show/bc/some_page'],
    ['catalog/club_buy', 'habboUI/open/hccenter'],
    ['catalog/habbicons', 'habbicons/open'],
    ['questengine/calendar', 'openView/calendar'],
    ['selfdonation/open', 'wired-tools/selfdonation']
];

describe('official link spellings', () => {
    it.each(CASES)('%s is raised as %s', (link, expected) => {
        expect(translateAirLink(link)).toBe(expected);
    });

    it('never translates a link it produced', () => {
        for (const [, translated] of CASES) expect(translateAirLink(translated)).toBeNull();
    });

    it('leaves the links this client already answers alone', () => {
        for (const link of ['catalog/open/pets', 'inventory/show', 'camera/toggle', 'navigator/goto/5', 'questengine/quests', 'messenger/abc', '']) {
            expect(translateAirLink(link)).toBeNull();
        }
    });

    it('opens the chat with whichever id is not the player', () => {
        expect(translateAirLink('friendlist/openchat/5:9', 5)).toBe('friends-messenger/9');
        expect(translateAirLink('friendlist/openchat/9:5', 5)).toBe('friends-messenger/9');
        expect(translateAirLink('friendlist/openchat/x', 5)).toBe('friends/show');
    });

    it('turns a web room report into the room report link, decoding the name', () => {
        const name = btoa(String.fromCharCode(...new TextEncoder().encode('Café / lounge')));

        expect(translateAirLink(`navigator/report/12/${name}`)).toBe(`help/report/room/12/${escape('Café / lounge')}`);
        expect(translateAirLink('navigator/report/abc/x')).toBeNull();
    });

    it('names the links that are actions', () => {
        expect(getAirLinkAction('roomThumbnailCamera/open')).toEqual({ type: 'roomThumbnail' });
        expect(getAirLinkAction('friendbar/findfriends')).toEqual({ type: 'findFriends' });
        expect(getAirLinkAction('friendbar/user/Frank')).toEqual({ type: 'profileByName', name: 'Frank' });
        expect(getAirLinkAction('friendbar/other')).toBeNull();
        expect(getAirLinkAction('catalog/open')).toBeNull();
    });
});
