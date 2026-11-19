export interface PluginScript {
    src: string;
    integrity?: string;
}

/** An `external.plugins` entry: a URL, or a URL with the Subresource Integrity hash of the file it must serve. */
export type PluginEntry = string | { url?: unknown; integrity?: unknown };

const INTEGRITY = /^(sha256|sha384|sha512)-[A-Za-z0-9+/]+={0,2}( (sha256|sha384|sha512)-[A-Za-z0-9+/]+={0,2})*$/;

/**
 * The plugin scripts the client may load. A plugin runs on the client's own origin, next to the session, so it
 * must come from this origin or over https, and, when the hotel lists its plugin hosts, only from those hosts. An
 * entry with an integrity hash is refused by the browser if the file it serves changed. Anything else is skipped
 * with the reason.
 */
export const resolvePluginScripts = (
    entries: readonly PluginEntry[],
    allowedHosts: readonly string[],
    clientOrigin: string,
    warn: (message: string) => void = () => {},
    trustedOrigins: readonly string[] = []
): PluginScript[] => {
    const hosts = allowedHosts.map((host) => String(host).trim().toLowerCase()).filter(Boolean);
    const scripts: PluginScript[] = [];

    for (const entry of entries) {
        const rawUrl = typeof entry === 'string' ? entry : typeof entry?.url === 'string' ? entry.url : '';
        const rawIntegrity = typeof entry === 'object' && typeof entry?.integrity === 'string' ? entry.integrity.trim() : '';

        let target: URL;
        try {
            target = new URL(rawUrl.trim(), clientOrigin);
        } catch {
            warn(`skipped, not a URL: ${rawUrl}`);
            continue;
        }

        // The emulator that lists its plugins' scripts is trusted as the client's own origin: it may be http in
        // development and is not one of the hosts the hotel lists for scripts served elsewhere.
        const sameOrigin = target.origin === clientOrigin || trustedOrigins.includes(target.origin);

        if (!sameOrigin && target.protocol !== 'https:') {
            warn(`skipped, only this origin or https: ${target.href}`);
            continue;
        }

        if (!sameOrigin && hosts.length && !hosts.includes(target.hostname.toLowerCase())) {
            warn(`skipped, host not in external.plugins.allowed.hosts: ${target.href}`);
            continue;
        }

        if (rawIntegrity && !INTEGRITY.test(rawIntegrity)) {
            warn(`skipped, malformed integrity: ${target.href}`);
            continue;
        }

        if (scripts.some((script) => script.src === target.href)) continue;

        scripts.push(rawIntegrity ? { src: target.href, integrity: rawIntegrity } : { src: target.href });
    }

    return scripts;
};

/**
 * The plugin entries the emulator lists at its client plugins endpoint, `{ plugins: [{ name, url, integrity }] }`,
 * with each URL resolved against the endpoint. An entry without a well-formed integrity is skipped: the emulator
 * always sends one, so a missing one means the answer is not the emulator's.
 */
export const serverPluginEntries = (body: unknown, endpoint: string, warn: (message: string) => void = () => {}): PluginEntry[] => {
    const plugins = (body as { plugins?: unknown } | null)?.plugins;

    if (!Array.isArray(plugins)) {
        warn(`the plugin list at ${endpoint} is not { plugins: [...] }`);
        return [];
    }

    const entries: PluginEntry[] = [];

    for (const plugin of plugins) {
        const url = typeof plugin?.url === 'string' ? plugin.url.trim() : '';
        const integrity = typeof plugin?.integrity === 'string' ? plugin.integrity.trim() : '';

        if (!url || !INTEGRITY.test(integrity)) {
            warn(`skipped a listed plugin without a URL or an integrity: ${JSON.stringify(plugin)}`);
            continue;
        }

        try {
            entries.push({ url: new URL(url, endpoint).href, integrity });
        } catch {
            warn(`skipped, not a URL: ${url}`);
        }
    }

    return entries;
};
