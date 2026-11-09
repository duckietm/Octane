import { CreateLinkEvent } from '@octane/renderer';
import { MouseEvent } from 'react';
import { SanitizeHtml } from './SanitizeHtml';

/** Where an `event:` link waits after sanitising: a fragment link the sanitizer keeps. */
const INTERNAL_LINK_PREFIX = '#octane-event:';

/**
 * Sanitises page HTML whose links are AIR client links (`<a href="event:habbopages/...">`, an html window with
 * `link_target="internal"`). The sanitizer drops the unknown `event:` scheme, so those links are first turned into
 * fragment links; {@link handleInternalLinkClick} hands them back to the client's link events.
 */
export const SanitizeHtmlWithInternalLinks = (html: string): string =>
    SanitizeHtml((html ?? '').replace(/href\s*=\s*(["'])\s*event:/gi, (_match, quote: string) => `href=${quote}${INTERNAL_LINK_PREFIX}`));

/** The click handler for HTML from {@link SanitizeHtmlWithInternalLinks}: an internal link opens in the client. */
export const handleInternalLinkClick = (event: MouseEvent<HTMLElement>): void => {
    const anchor = (event.target as HTMLElement | null)?.closest?.('a');
    const href = anchor?.getAttribute('href') ?? '';

    if (!href.startsWith(INTERNAL_LINK_PREFIX)) return;

    event.preventDefault();

    const link = href.substring(INTERNAL_LINK_PREFIX.length).trim();

    if (link) CreateLinkEvent(link);
};
