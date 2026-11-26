import { GetConfiguration } from '@octane/renderer';
import DOMPurify from 'dompurify';

// Inline styles SanitizeHtml keeps: text formatting only. Chat and alert HTML used to keep any style, so a name or an
// alert could cover the whole client with `position:fixed;inset:0` - an overlay for phishing or tracking.
const TEXT_STYLE_PROPERTIES = new Set(['color', 'background-color', 'font-weight', 'font-style', 'font-size', 'text-decoration', 'text-align']);

// Which sanitiser is running, so each one's rules stay out of the others, which share the DOMPurify instance:
// 'strict' for SanitizeHtml, 'hotel' for SanitizeHotelHtml.
let textPass: 'strict' | 'hotel' | null = null;
// True while SanitizePageHtml runs: help pages keep their layout styles, but not a position that takes them out of
// their window (fixed or sticky), which could lay an overlay over the whole client.
let pagePass = false;

/** A page style without fixed or sticky positioning; every other declaration is kept as written. */
export const pageStyle = (style: string): string =>
    style
        .split(';')
        .map((declaration) => declaration.trim())
        .filter((declaration) => {
            const colon = declaration.indexOf(':');

            if (colon <= 0) return false;

            const property = declaration.slice(0, colon).trim().toLowerCase();
            const value = declaration.slice(colon + 1).trim().toLowerCase();

            return !(property === 'position' && /^(fixed|sticky)\b/.test(value));
        })
        .join('; ');

// A font size SanitizeHtml keeps: up to about three times the client's text. A bigger one let one alert word fill the screen.
const FONT_SIZE_KEYWORDS = new Set(['xx-small', 'x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', 'smaller', 'larger']);
const FONT_SIZE_LIMITS: Record<string, number> = { px: 36, pt: 27, em: 3, rem: 3, '%': 300 };

const isModestFontSize = (value: string): boolean => {
    const size = value.trim().toLowerCase();

    if (FONT_SIZE_KEYWORDS.has(size)) return true;

    const match = /^(\d+(?:\.\d+)?)(px|pt|em|rem|%)$/.exec(size);

    return !!match && Number(match[1]) <= FONT_SIZE_LIMITS[match[2]];
};

const textOnlyStyle = (style: string, limitFontSize = false): string =>
    style
        .split(';')
        .map((declaration) => declaration.trim())
        .filter((declaration) => {
            const colon = declaration.indexOf(':');

            if (colon <= 0) return false;

            const property = declaration.slice(0, colon).trim().toLowerCase();
            const value = declaration.slice(colon + 1).toLowerCase();

            if (!TEXT_STYLE_PROPERTIES.has(property) || value.includes('url(') || value.includes('expression(')) return false;

            return !limitFontSize || property !== 'font-size' || isModestFontSize(value);
        })
        .join('; ');

/** The hosts of every URL the hotel configured (asset, image, badge and API servers), read when an image is checked. */
const configuredHosts = (): Set<string> => {
    const hosts = new Set<string>();

    try {
        GetConfiguration().definitions.forEach((value) => {
            if (typeof value !== 'string' || !/^(https?:)?\/\//i.test(value)) return;

            try {
                hosts.add(new URL(value, window.location.href).host.toLowerCase());
            } catch {}
        });
    } catch {}

    return hosts;
};

/** An image may come from the client's own origin, a relative path, or a host the hotel configured. */
const isAllowedImageSource = (src: string): boolean => {
    const value = src.trim();

    if (!value.length) return false;

    try {
        const url = new URL(value, window.location.href);

        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
        if (url.host === window.location.host) return true;

        return configuredHosts().has(url.host.toLowerCase());
    } catch {
        return false;
    }
};

// Any link that opens a new browsing context gets a safe rel so it cannot
// reverse-tabnab the opener. Registered once at module load; applies to every
// SanitizeHtml() call (and overrides any attacker-supplied rel).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const element = node as Element;

    if (textPass) {
        // A link opens a new tab, never the page that holds the client: one with no target (or _top, _parent) used to
        // navigate the whole client away, and a look-alike page could then ask for the password.
        if (element.tagName === 'A' && (element.getAttribute('target') || element.getAttribute('href'))) element.setAttribute('target', '_blank');

        if (element.tagName === 'IMG' && !isAllowedImageSource(element.getAttribute('src') ?? '')) element.removeAttribute('src');

        const style = element.getAttribute('style');

        if (style !== null) {
            const kept = textOnlyStyle(style, textPass === 'strict');

            if (kept.length) element.setAttribute('style', kept);
            else element.removeAttribute('style');
        }
    }

    if (pagePass) {
        const style = element.getAttribute('style');

        if (style !== null) {
            const kept = pageStyle(style);

            if (kept.length) element.setAttribute('style', kept);
            else element.removeAttribute('style');
        }
    }

    if (element.tagName === 'A' && element.getAttribute('target')) {
        element.setAttribute('rel', 'noopener noreferrer');
    }
});

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes a plain text (a name a user chose) before it is put into a text that is then rendered as HTML. */
export const EscapeHtml = (text: string): string => String(text ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);

// The two slashes matter: `https:path` and `https:/path` resolve against the client's own site.
const WEB_LINK = /^https?:\/\//i;

/**
 * Sanitises HTML that a player, staff member or the server can put words into: chat, alerts, notifications, wired
 * texts and texts with server values. It keeps text formatting, colours and absolute http(s) links, which open in a
 * new tab without a handle back to the client. Images, classes (the client's own utility classes could lay an overlay
 * over the whole client), a huge font size and every other link are dropped. Names of users, bots and pets are not
 * HTML: render them as React text instead.
 */
export const SanitizeHtml = (html: string): string => {
    textPass = 'strict';

    try {
        return DOMPurify.sanitize(html ?? '', {
            ALLOWED_TAGS: ['b', 'i', 'u', 'br', 'span', 'div', 'p', 'a', 'strong', 'em'],
            ALLOWED_ATTR: ['href', 'style'],
            ALLOWED_URI_REGEXP: WEB_LINK,
            ALLOW_DATA_ATTR: false
        });
    } finally {
        textPass = null;
    }
};

/**
 * Sanitises the hotel's own texts, such as catalog pages and collectibles, which may carry images from the hotel's
 * own servers, classes and styled text. Never use it for a text that holds anything a player wrote or chose.
 */
export const SanitizeHotelHtml = (html: string): string => {
    textPass = 'hotel';

    try {
        return DOMPurify.sanitize(html ?? '', {
            ALLOWED_TAGS: ['b', 'i', 'u', 'br', 'span', 'div', 'p', 'a', 'strong', 'em', 'img'],
            ALLOWED_ATTR: ['href', 'target', 'class', 'style', 'src', 'alt', 'rel'],
            ALLOW_DATA_ATTR: false
        });
    } finally {
        textPass = null;
    }
};

/** Help pages (habbopages) are richer HTML: keep layout tags, drop scripts, handlers, forms and frames. */
export const SanitizePageHtml = (html: string): string => {
    pagePass = true;

    try {
        return DOMPurify.sanitize(html, {
            FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'svg', 'math'],
            FORBID_ATTR: ['srcset'],
            ALLOW_DATA_ATTR: false
        });
    } finally {
        pagePass = false;
    }
};
