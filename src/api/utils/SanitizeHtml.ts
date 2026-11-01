import { GetConfiguration } from '@octane/renderer';
import DOMPurify from 'dompurify';

// Inline styles SanitizeHtml keeps: text formatting only. Chat and alert HTML used to keep any style, so a name or an
// alert could cover the whole client with `position:fixed;inset:0` - an overlay for phishing or tracking.
const TEXT_STYLE_PROPERTIES = new Set(['color', 'background-color', 'font-weight', 'font-style', 'font-size', 'text-decoration', 'text-align']);

// True while SanitizeHtml runs, so its stricter rules stay out of SanitizePageHtml, which shares the DOMPurify instance.
let strictPass = false;
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

const textOnlyStyle = (style: string): string =>
    style
        .split(';')
        .map((declaration) => declaration.trim())
        .filter((declaration) => {
            const colon = declaration.indexOf(':');

            if (colon <= 0) return false;

            const property = declaration.slice(0, colon).trim().toLowerCase();
            const value = declaration.slice(colon + 1).toLowerCase();

            return TEXT_STYLE_PROPERTIES.has(property) && !value.includes('url(') && !value.includes('expression(');
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

    if (strictPass) {
        // A link opens a new tab, never the page that holds the client: one with no target (or _top, _parent) used to
        // navigate the whole client away, and a look-alike page could then ask for the password.
        if (element.tagName === 'A' && (element.getAttribute('target') || element.getAttribute('href'))) element.setAttribute('target', '_blank');

        if (element.tagName === 'IMG' && !isAllowedImageSource(element.getAttribute('src') ?? '')) element.removeAttribute('src');

        const style = element.getAttribute('style');

        if (style !== null) {
            const kept = textOnlyStyle(style);

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

/**
 * Sanitises the small HTML of chat, alerts, notifications and catalog texts. Names of users, bots and pets are not
 * HTML: render them as React text instead.
 */
export const SanitizeHtml = (html: string): string => {
    strictPass = true;

    try {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['b', 'i', 'u', 'br', 'span', 'div', 'p', 'a', 'strong', 'em', 'img'],
            ALLOWED_ATTR: ['href', 'target', 'class', 'style', 'src', 'alt', 'rel'],
            ALLOW_DATA_ATTR: false
        });
    } finally {
        strictPass = false;
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
