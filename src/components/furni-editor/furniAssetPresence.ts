import { GetConfiguration } from '@octane/renderer';

export type AssetPresence = 'present' | 'missing' | 'unknown';

export interface AssetPresenceReport {
    icon: AssetPresence;
    bundle: AssetPresence;
    iconUrl: string;
    bundleUrl: string;
}

// The renderer builds furni asset URLs from two configuration templates with a
// %libname% placeholder (and %param% for coloured icons). Read them the same
// way and probe the files, so a missing bundle explains an empty preview
// before anyone digs through the asset tree.
export const assetUrlsFor = (classname: string): { iconUrl: string; bundleUrl: string } => {
    const libname = classname.split('*')[0].trim();
    const config = typeof GetConfiguration === 'function' ? GetConfiguration() : null;
    const read = (key: string): string => {
        const value = typeof config?.getValue === 'function' ? config.getValue<string>(key) : '';
        return typeof value === 'string' ? value : '';
    };

    const fill = (template: string) => (template && libname ? template.replace(/%libname%/gi, libname).replace(/%param%/gi, '') : '');

    return { iconUrl: fill(read('furni.asset.icon.url')), bundleUrl: fill(read('furni.asset.url')) };
};

const probe = async (url: string, signal: AbortSignal): Promise<AssetPresence> => {
    if (!url || typeof fetch !== 'function') return 'unknown';
    try {
        const head = await fetch(url, { method: 'HEAD', signal });
        if (head.ok) return 'present';
        if (head.status === 404) return 'missing';
        // A server that refuses HEAD answers with the real status on GET.
        if (head.status === 405 || head.status === 501) {
            const get = await fetch(url, { method: 'GET', signal });
            return get.ok ? 'present' : get.status === 404 ? 'missing' : 'unknown';
        }
        return 'unknown';
    } catch {
        return 'unknown';
    }
};

export const checkAssetPresence = async (classname: string, signal: AbortSignal): Promise<AssetPresenceReport> => {
    const { iconUrl, bundleUrl } = assetUrlsFor(classname);
    const [icon, bundle] = await Promise.all([probe(iconUrl, signal), probe(bundleUrl, signal)]);
    return { icon, bundle, iconUrl, bundleUrl };
};
