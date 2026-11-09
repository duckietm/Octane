/**
 * The URL of a help page (habbopages) for a path taken from a link event, or null when the path
 * would leave the configured folder ("..", encoded slashes, another host or scheme).
 */
export const resolveHabboPageUrl = (base: string, path: string, location: string = globalThis.location?.href): string | null => {
    if (!base || !path) return null;

    let decoded: string;

    try {
        decoded = decodeURIComponent(path);
    } catch {
        return null;
    }

    if (decoded.includes('\\') || decoded.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(decoded)) return null;
    if (decoded.split('/').some((segment) => segment === '..' || segment === '.')) return null;

    try {
        const baseUrl = new URL(base, location);
        const url = new URL(base + path, location);

        if (url.origin !== baseUrl.origin || !url.pathname.startsWith(baseUrl.pathname)) return null;

        return url.href;
    } catch {
        return null;
    }
};
