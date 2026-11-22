import { GetConfiguration } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetOptionalConfigurationValue } from '../../api/octane/GetConfigurationValue';
import { PluginEntry, PluginScript, resolvePluginScripts, serverPluginEntries } from '../../api/utils/resolvePluginScripts';
import { subscribePlugins } from './OctanePluginApi';

import './OctanePluginApi';

const PLUGIN_SCRIPT_ATTRIBUTE = 'data-octane-plugin';

/**
 * Adds a plugin script to the document head, once per URL. The element is created here rather than rendered by
 * React: a `<script>` React renders on the client with load listeners is inserted inert and never runs.
 */
export const appendPluginScript = (script: PluginScript, target: Document = document): HTMLScriptElement | null => {
    const existing = Array.from(target.querySelectorAll<HTMLScriptElement>(`script[${PLUGIN_SCRIPT_ATTRIBUTE}]`)).find(
        (element) => element.getAttribute(PLUGIN_SCRIPT_ATTRIBUTE) === script.src
    );

    if (existing) return null;

    const element = target.createElement('script');
    element.async = true;
    element.src = script.src;
    element.setAttribute(PLUGIN_SCRIPT_ATTRIBUTE, script.src);

    if (script.integrity) {
        element.setAttribute('integrity', script.integrity);
        element.setAttribute('crossorigin', 'anonymous');
    }

    element.addEventListener('load', () => console.log(`[OctanePlugins] Loaded: ${script.src}`));
    element.addEventListener('error', () => console.warn(`[OctanePlugins] Failed to load: ${script.src}`));
    target.head.appendChild(element);

    return element;
};

/** Where the emulator lists the client scripts of its plugins (`external.plugins.server.url`); empty turns it off. */
const pluginListUrl = (): string => {
    const configured = GetOptionalConfigurationValue<string>('external.plugins.server.url', '${api.url}/api/client-plugins');

    if (typeof configured !== 'string' || !configured.trim()) return '';

    try {
        return GetConfiguration().interpolate(configured.trim());
    } catch {
        return configured.trim();
    }
};

/**
 * The scripts of the plugins installed on the emulator. Each comes with its integrity, and the emulator's origin is
 * trusted like the client's own; an endpoint that is missing or answers with something else loads nothing.
 */
export const fetchServerPluginScripts = async (
    endpoint: string,
    allowedHosts: readonly string[],
    clientOrigin: string,
    warn: (message: string) => void,
    fetcher: typeof fetch = fetch
): Promise<PluginScript[]> => {
    let url: URL;

    try {
        url = new URL(endpoint, clientOrigin);
    } catch {
        warn(`external.plugins.server.url is not a URL: ${endpoint}`);
        return [];
    }

    try {
        const response = await fetcher(url.href, { headers: { Accept: 'application/json' }, credentials: 'omit' });

        // An emulator without the endpoint, or a dev server answering with its page, lists no plugins.
        if (!response.ok || !(response.headers.get('content-type') || '').includes('json')) return [];

        const entries = serverPluginEntries(await response.json(), url.href, warn);

        return resolvePluginScripts(entries, allowedHosts, clientOrigin, warn, [url.origin]);
    } catch (e) {
        warn(`could not read the plugin list at ${url.href}: ${e instanceof Error ? e.message : String(e)}`);
        return [];
    }
};

export const ExternalPluginLoader: FC<{}> = () => {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        return subscribePlugins(() => forceUpdate((n) => n + 1));
    }, []);

    useEffect(() => {
        let entries: PluginEntry[] = [];
        let allowedHosts: string[] = [];
        let serverUrl = '';

        // Every key is optional (no plugins is the default), so a config without them does not warn.
        try {
            entries = GetOptionalConfigurationValue<PluginEntry[]>('external.plugins', []) || [];
            allowedHosts = GetOptionalConfigurationValue<string[]>('external.plugins.allowed.hosts', []) || [];
            serverUrl = pluginListUrl();
        } catch (e) {
            console.warn('[OctanePlugins] Could not read external.plugins config:', e);
            return;
        }

        const hosts = Array.isArray(allowedHosts) ? allowedHosts : [];
        const warn = (message: string) => console.warn(`[OctanePlugins] ${message}`);

        // A plugin registers itself once it runs; its script stays in the page for the whole session.
        if (Array.isArray(entries) && entries.length) {
            const scripts = resolvePluginScripts(entries, hosts, window.location.origin, warn);

            console.log(
                '[OctanePlugins] Loading configured plugins:',
                scripts.map((script) => script.src)
            );

            for (const script of scripts) appendPluginScript(script);
        }

        if (!serverUrl) return;

        let cancelled = false;

        fetchServerPluginScripts(serverUrl, hosts, window.location.origin, warn).then((scripts) => {
            if (cancelled || !scripts.length) return;

            console.log(
                '[OctanePlugins] Loading the emulator plugins:',
                scripts.map((script) => script.src)
            );

            for (const script of scripts) appendPluginScript(script);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return null;
};
