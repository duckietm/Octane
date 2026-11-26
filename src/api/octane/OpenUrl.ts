import { CreateLinkEvent } from '@octane/renderer';
import { isSafeExternalUrl } from '../utils/isSafeExternalUrl';

/** AIR's scheme for a link that stays in the client, such as `event:navigator/goto/1`. */
const EVENT_SCHEME = 'event:';
// Only absolute links count as web links: `https:path` is read as a path on the client's own site by some parsers.
const WEB_LINK = /^https?:\/\//i;
const WEB_SCHEME = /^https?:/i;
const ANY_SCHEME = /^[a-z][a-z\d+.-]*:/i;

/**
 * Opens a link from the hotel, an alert or a bubble. A web link opens in a new tab that cannot reach or redirect the
 * client tab. An `event:` link and a bare client link (`catalog/open/...`) run as a client link. Every other scheme
 * (`javascript:`, `data:`, ...) is neither, and is ignored.
 */
export const OpenUrl = (url: string) => {
    if (!url || typeof url !== 'string') return;

    const link = url.trim();

    if (!link.length) return;

    if (link.toLowerCase().startsWith(EVENT_SCHEME)) {
        const clientLink = link.substring(EVENT_SCHEME.length).trim();

        if (clientLink.length) CreateLinkEvent(clientLink);

        return;
    }

    if (WEB_SCHEME.test(link)) {
        if (WEB_LINK.test(link) && isSafeExternalUrl(link)) window.open(link, '_blank', 'noopener,noreferrer');

        return;
    }

    if (ANY_SCHEME.test(link)) return;

    CreateLinkEvent(link);
};
