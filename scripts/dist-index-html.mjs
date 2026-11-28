// The production index.html that minify-dist writes over Vite's: only the loader script, plus what a phone needs to run the client
// as an installed web app ("add to home screen"): the same viewport as the dev page (no zoom into focused fields, the notch area
// used, the keyboard laid over the page), the web app manifest and the home screen icon. Paths are relative, so a hotel serving the
// client from a sub folder still finds them next to index.html.

const escapeAttribute = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export const DIST_VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, interactive-widget=resizes-visual';

export const distAppHeadTags = () => [
    `<meta name="viewport" content="${ DIST_VIEWPORT }">`,
    '<meta name="theme-color" content="#000000">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
    '<link rel="manifest" href="site.webmanifest">',
    '<link rel="apple-touch-icon" href="apple-touch-icon.png">'
].join('');

/** `contentSecurityPolicy`: the policy for the meta tag, or an empty value for none. */
export const buildDistIndexHtml = ({ contentSecurityPolicy = '', buildVersion = '' } = {}) =>
{
    const cspMeta = contentSecurityPolicy ? `<meta http-equiv="Content-Security-Policy" content="${ escapeAttribute(contentSecurityPolicy) }">` : '';
    const version = encodeURIComponent(String(buildVersion));

    return `<!DOCTYPE html><html><head><meta charset="utf-8">${ cspMeta }${ distAppHeadTags() }<script async defer src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script></head><body><div id="root"></div><script src="configuration/bootstrap.js?v=${ version }"></script></body></html>`;
};
