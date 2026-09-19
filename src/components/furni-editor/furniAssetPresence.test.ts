import { afterEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ values: {} as Record<string, string> }));

vi.mock('@octane/renderer', () => ({
    GetConfiguration: () => ({ getValue: (key: string) => config.values[key] })
}));

import { assetUrlsFor, checkAssetPresence } from './furniAssetPresence';

afterEach(() => {
    vi.unstubAllGlobals();
    config.values = {};
});

describe('furni asset presence', () => {
    it('builds the icon and bundle urls from the renderer templates, without the colour suffix', () => {
        config.values = { 'furni.asset.icon.url': 'https://cdn/icons/%libname%_icon%param%.png', 'furni.asset.url': 'https://cdn/bundled/%libname%.nitro' };

        expect(assetUrlsFor('throne*2')).toEqual({ iconUrl: 'https://cdn/icons/throne_icon.png', bundleUrl: 'https://cdn/bundled/throne.nitro' });
    });

    it('reports present, missing and unknown from the probe answers', async () => {
        config.values = { 'furni.asset.icon.url': 'https://cdn/i/%libname%.png', 'furni.asset.url': 'https://cdn/b/%libname%.nitro' };
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => ({ ok: url.endsWith('.png'), status: url.endsWith('.png') ? 200 : 404 }))
        );

        const report = await checkAssetPresence('throne', new AbortController().signal);

        expect(report.icon).toBe('present');
        expect(report.bundle).toBe('missing');
    });

    it('answers unknown when the templates are not configured or the network fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Promise.reject(new Error('offline')))
        );

        const report = await checkAssetPresence('throne', new AbortController().signal);

        expect(report).toEqual({ icon: 'unknown', bundle: 'unknown', iconUrl: '', bundleUrl: '' });
    });
});
