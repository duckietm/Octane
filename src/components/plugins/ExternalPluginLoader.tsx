import { FC, useEffect, useState } from 'react';
import { GetOptionalConfigurationValue } from '../../api/octane/GetConfigurationValue';
import { PluginEntry, PluginScript, resolvePluginScripts } from '../../api/utils/resolvePluginScripts';
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

export const ExternalPluginLoader: FC<{}> = () => {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        return subscribePlugins(() => forceUpdate((n) => n + 1));
    }, []);

    useEffect(() => {
        let entries: PluginEntry[] = [];
        let allowedHosts: string[] = [];

        // Both keys are optional (no plugins is the default), so a config without them does not warn.
        try {
            entries = GetOptionalConfigurationValue<PluginEntry[]>('external.plugins', []) || [];
            allowedHosts = GetOptionalConfigurationValue<string[]>('external.plugins.allowed.hosts', []) || [];
        } catch (e) {
            console.warn('[OctanePlugins] Could not read external.plugins config:', e);
            return;
        }

        if (!Array.isArray(entries) || !entries.length) {
            console.log('[OctanePlugins] No external plugins configured');
            return;
        }

        const scripts = resolvePluginScripts(
            entries,
            Array.isArray(allowedHosts) ? allowedHosts : [],
            window.location.origin,
            (message) => console.warn(`[OctanePlugins] ${message}`)
        );

        console.log(
            '[OctanePlugins] Loading external plugins:',
            scripts.map((script) => script.src)
        );

        // A plugin registers itself once it runs; its script stays in the page for the whole session.
        for (const script of scripts) appendPluginScript(script);
    }, []);

    return null;
};
