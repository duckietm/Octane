/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { appendPluginScript, fetchServerPluginScripts } from './ExternalPluginLoader';

describe('external plugin scripts', () => {
    afterEach(() => {
        document.head.querySelectorAll('script[data-octane-plugin]').forEach((element) => element.remove());
    });

    it('adds a real script element to the head, so the browser runs it', () => {
        const element = appendPluginScript({ src: 'https://hotel.test/client/plugins/rp.js' });

        expect(element).not.toBeNull();
        expect(element.parentNode).toBe(document.head);
        expect(element.src).toBe('https://hotel.test/client/plugins/rp.js');
        expect(element.async).toBe(true);
        expect(element.hasAttribute('integrity')).toBe(false);
    });

    it('adds a script only once per URL', () => {
        appendPluginScript({ src: 'https://hotel.test/client/plugins/rp.js' });

        expect(appendPluginScript({ src: 'https://hotel.test/client/plugins/rp.js' })).toBeNull();
        expect(document.head.querySelectorAll('script[data-octane-plugin]')).toHaveLength(1);
    });

    it('pins the content when the entry has an integrity hash', () => {
        const element = appendPluginScript({ src: 'https://cdn.test/rp.js', integrity: 'sha384-abc' });

        expect(element.getAttribute('integrity')).toBe('sha384-abc');
        expect(element.getAttribute('crossorigin')).toBe('anonymous');
    });

    it('says whether the script loaded', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        appendPluginScript({ src: 'https://hotel.test/a.js' }).dispatchEvent(new Event('load'));
        appendPluginScript({ src: 'https://hotel.test/b.js' }).dispatchEvent(new Event('error'));

        expect(log).toHaveBeenCalledWith('[OctanePlugins] Loaded: https://hotel.test/a.js');
        expect(warn).toHaveBeenCalledWith('[OctanePlugins] Failed to load: https://hotel.test/b.js');
        log.mockRestore();
        warn.mockRestore();
    });
});

describe('the plugins the emulator lists', () => {
    const HASH = 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC';
    const jsonResponse = (body: unknown, init: { status?: number; type?: string } = {}) =>
        new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { 'content-type': init.type ?? 'application/json' } });

    it('loads every listed script from the emulator, with its integrity', async () => {
        const fetcher = vi.fn(async () => jsonResponse({ plugins: [{ name: 'RP', url: '/api/client-plugins/rp.js', integrity: HASH }] }));

        const scripts = await fetchServerPluginScripts('http://localhost:2096/api/client-plugins', [], 'http://localhost:5173', () => {}, fetcher);

        expect(fetcher).toHaveBeenCalledWith('http://localhost:2096/api/client-plugins', expect.objectContaining({ credentials: 'omit' }));
        expect(scripts).toEqual([{ src: 'http://localhost:2096/api/client-plugins/rp.js', integrity: HASH }]);
    });

    it('does not trust a host the list points elsewhere, unless the hotel allows it', async () => {
        const fetcher = vi.fn(async () =>
            jsonResponse({
                plugins: [
                    { url: 'http://evil.example/x.js', integrity: HASH },
                    { url: 'https://cdn.example/y.js', integrity: HASH }
                ]
            })
        );

        const scripts = await fetchServerPluginScripts('http://localhost:2096/api/client-plugins', ['cdn.example'], 'http://localhost:5173', () => {}, fetcher);

        expect(scripts.map((script) => script.src)).toEqual(['https://cdn.example/y.js']);
    });

    it('loads nothing from an emulator without the endpoint or from a page answering in its place', async () => {
        const missing = vi.fn(async () => jsonResponse({ error: 'Not found.' }, { status: 404 }));
        const page = vi.fn(async () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }));
        const failing = vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        });
        const warnings: string[] = [];

        expect(await fetchServerPluginScripts('/api/client-plugins', [], 'http://localhost:5173', () => {}, missing)).toEqual([]);
        expect(await fetchServerPluginScripts('/api/client-plugins', [], 'http://localhost:5173', () => {}, page)).toEqual([]);
        expect(await fetchServerPluginScripts('/api/client-plugins', [], 'http://localhost:5173', (m) => warnings.push(m), failing)).toEqual([]);
        expect(warnings[0]).toContain('Failed to fetch');
    });
});
