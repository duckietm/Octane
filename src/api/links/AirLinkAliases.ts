/**
 * The official client's link spellings as the links this client answers. Hotel content (catalogue pages, habbopages,
 * notifications, landing widgets, links the server sends) is written in the official spelling, and the link dispatcher
 * matches a tracker by its exact prefix, so a link in that spelling reached nothing here.
 *
 * `translateAirLink` returns the link to raise in its place, or null when the link needs no translation. A translated
 * link is never itself translatable, so raising it cannot loop.
 */
const decodeBase64 = (value: string): string => {
    try {
        const binary = atob(value);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

        return new TextDecoder('utf-8').decode(bytes);
    } catch {
        return '';
    }
};

const isId = (value: string | undefined) => !!value && /^\d+$/.test(value);

export const translateAirLink = (link: string, ownUserId: number = 0): string | null => {
    const parts = (link ?? '').split('/');

    switch (parts[0]) {
        case 'avatareditor':
            return parts[1] === 'open' ? 'avatar-editor/show' : null;
        case 'friendlist':
            if (parts[1] === 'open') return 'friends/show';

            // friendlist/openchat/<idA>:<idB>: the conversation with whichever of the two is not the player.
            if (parts[1] === 'openchat' && parts[2]) {
                const friendId = parts[2].split(':').find((id) => isId(id) && Number(id) !== ownUserId);

                return friendId ? `friends-messenger/${friendId}` : 'friends/show';
            }

            return null;
        case 'messenger':
            return isId(parts[1]) ? `friends-messenger/${parts[1]}` : null;
        case 'discord':
            return parts[1] === 'settings' && parts[2] === 'open' ? 'discord-settings/show' : null;
        case 'badge_leaderboard': {
            // AIR: badge_leaderboard/<type>/<rarity>/<page>. The board opens on that list and page.
            const args = parts.slice(1, 4).filter((part) => part !== '');

            return args.length && args.every((part) => /^-?\d+$/.test(part)) ? `badge-leaderboard/show/${args.join('/')}` : 'badge-leaderboard/show';
        }
        case 'wiredrewards':
            return parts[1] === 'open' && isId(parts[2]) ? `wiredchestreward/open/${parts[2]}` : null;
        case 'camera':
            return parts[1] === 'open' ? 'camera/show' : null;
        case 'inventory':
            if (parts[1] !== 'open') return null;

            // inventory/open[/<tab>[/<item>]]: the item (a badge code, a furni id) is passed on to be selected.
            return parts[2] ? `inventory/show/${parts.slice(2).join('/')}` : 'inventory/show';
        case 'catalog':
            // catalog/warehouse[/<page>]: the Builders Club catalogue, on that page when one is named.
            if (parts[1] === 'warehouse') return parts[2] ? `catalog/show/bc/${parts.slice(2).join('/')}` : 'catalog/show/bc';
            if (parts[1] === 'club_buy') return 'habboUI/open/hccenter';
            if (parts[1] === 'habbicons') return 'habbicons/open';

            return null;
        case 'questengine':
            return parts[1] === 'calendar' ? 'openView/calendar' : null;
        case 'selfdonation':
            return parts[1] === 'open' ? 'wired-tools/selfdonation' : null;
        case 'navigator':
            // navigator/report/<roomId>/<base64 room name>: a room report raised from the web.
            if (parts[1] === 'report' && isId(parts[2]) && parts[3]) {
                return `help/report/room/${parts[2]}/${escape(decodeBase64(parts.slice(3).join('/')))}`;
            }

            return null;
    }

    return null;
};

export type AirLinkAction = { type: 'roomThumbnail' } | { type: 'findFriends' } | { type: 'profileByName'; name: string };

/** The official links that are an action here and not another link. */
export const getAirLinkAction = (link: string): AirLinkAction | null => {
    const parts = (link ?? '').split('/');

    if (parts[0] === 'roomThumbnailCamera') return parts[1] === 'open' ? { type: 'roomThumbnail' } : null;

    if (parts[0] === 'friendbar') {
        if (parts[1] === 'findfriends') return { type: 'findFriends' };
        if (parts[1] === 'user' && parts[2]) return { type: 'profileByName', name: parts.slice(2).join('/') };
    }

    return null;
};
