import './pixiPatch';

import { GetConfiguration } from '@octane/renderer';
import { derivePetConfig, DerivedPetConfig, PetDefinition } from './api/octane/PetData';
import { parseJsonDocument, UiJsonMode } from './json/JsonDocumentParser';
import { configFileUrl, getClientMode, installSecureFetch } from './secure-assets';

declare const __OCTANE_JSON_MODE__: UiJsonMode | undefined;

const resolveJsonMode = (): UiJsonMode => {
    try {
        if (typeof __OCTANE_JSON_MODE__ !== 'undefined' && __OCTANE_JSON_MODE__) {
            if (__OCTANE_JSON_MODE__ === 'legacy' || __OCTANE_JSON_MODE__ === 'jsonc' || __OCTANE_JSON_MODE__ === 'auto') return __OCTANE_JSON_MODE__;
        }
    } catch {}

    return 'auto';
};

const ensureMobileViewport = () => {
    let viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');

    if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
    }

    viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
};

ensureMobileViewport();

const setBootDebug = (message: string) => {
    try {
        (window as any).__octaneBootDebug = message;
        const secureNode = document.getElementById('octane-secure-debug');

        if (secureNode) secureNode.textContent = `${secureNode.textContent}\n${message}`;
    } catch {}
};

const deployBaseUrl = (): string => {
    try {
        const loaderBase = (window as any).__octaneLoaderBase;
        if (typeof loaderBase === 'string' && loaderBase.length) return new URL('..', loaderBase).toString();
    } catch {}

    try {
        const moduleUrl = (import.meta as any).url;
        if (typeof moduleUrl === 'string' && moduleUrl.length) return new URL('..', new URL('.', moduleUrl)).toString();
    } catch {}

    try {
        const base = (import.meta as any).env?.BASE_URL;
        if (typeof base === 'string' && base.length) {
            const trimmed = base.replace(/^\/+/, '').replace(/\/+$/, '');
            return trimmed ? `${window.location.origin}/${trimmed}/` : `${window.location.origin}/`;
        }
    } catch {}

    return `${window.location.origin}/`;
};

const loadClientMode = async () => {
    try {
        if ((window as any).__octaneClientMode) return;

        const url = new URL('configuration/client-mode.json', deployBaseUrl());
        url.searchParams.set('v', Date.now().toString(36));

        const response = await fetch(url.toString());

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const mode = resolveJsonMode();

        (window as any).__octaneClientMode = parseJsonDocument(text, mode, url.toString());
        setBootDebug(`boot: client-mode loaded (mode=${mode})`);
    } catch (error) {
        setBootDebug(`boot: client-mode fallback ${error?.message || error}`);
    }
};

const loadPetConfig = async (): Promise<DerivedPetConfig | null> => {
    try {
        const url = configFileUrl('pets.json', true);
        const response = await fetch(url);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const parsed = parseJsonDocument(text, resolveJsonMode(), url) as { pets?: unknown } | unknown[];
        const list = Array.isArray(parsed) ? parsed : (parsed as { pets?: unknown })?.pets;
        const derived = derivePetConfig(list as PetDefinition[]);

        setBootDebug(derived ? 'boot: pet config loaded' : 'boot: pets.json empty, using config pet.types');

        return derived;
    } catch (error) {
        setBootDebug(`boot: pets.json fallback ${error?.message || error}`);

        return null;
    }
};

await loadClientMode();

installSecureFetch();
setBootDebug('boot: secure fetch installed');

const search = new URLSearchParams(window.location.search);
const clientMode = getClientMode();
const petConfig = await loadPetConfig();

(window as any).OctaneSecureApiUrl = clientMode.apiBaseUrl || window.location.origin;
(window as any).OctaneClientMode = clientMode;
(window as any).OctaneConfig = {
    'config.urls': [configFileUrl('renderer-config.json', true), configFileUrl('ui-config.json', true)],
    ...(petConfig ?? {}),
    'sso.ticket': search.get('sso') || null,
    'forward.type': search.get('room') ? 2 : -1,
    'forward.id': search.get('room') || 0,
    'friend.id': search.get('friend') || 0
};

// Legacy aliases so external scripts written against the old Nitro globals keep working
(window as any).NitroConfig = (window as any).OctaneConfig;
(window as any).NitroClientMode = clientMode;
(window as any).NitroSecureApiUrl = (window as any).OctaneSecureApiUrl;

setBootDebug('boot: OctaneConfig assigned');

// Load renderer-config.json + ui-config.json BEFORE rendering React. Otherwise
// the first paint triggers a flood of "Missing configuration key" warnings for
// every key components read synchronously (asset.url, login.endpoint, …) until
// prepare()'s deferred init() finally lands. Doing it here makes the config
// already populated by the time index.tsx mounts <App/>.
try {
    await GetConfiguration().init();
    setBootDebug('boot: configuration init done');
} catch (error) {
    setBootDebug(`boot: configuration init failed ${error?.message || error}`);
}

import('./index')
    .then(() => setBootDebug('boot: app bundle imported'))
    .catch((error) => {
        setBootDebug(`boot: import failed ${error?.message || error}`);
        throw error;
    });
