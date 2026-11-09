/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const API = 'https://api.test';
const PLAIN_CONFIG = 'https://hotel.test/configuration/';

type FetchCall = { url: string; init?: RequestInit };

const serverKey = async (): Promise<string> => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));

    return btoa(String.fromCharCode(...spki));
};

/** Installs the secure fetch over a fake network and returns the calls that reached it. */
const install = async (bootstrap: () => Promise<Response>) => {
    const calls: FetchCall[] = [];

    window.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        calls.push({ url, init });

        if (url === `${API}/nitro-sec/bootstrap`) return bootstrap();

        return new Response(`plain:${url}`, { status: 200 });
    }) as typeof window.fetch;

    (window as any).__octaneClientMode = {
        secureAssetsEnabled: true,
        secureApiEnabled: true,
        apiBaseUrl: API,
        plainConfigBaseUrl: PLAIN_CONFIG
    };

    vi.resetModules();
    const module = await import('./secure-assets');

    module.installSecureFetch();

    return { module, calls, bootstraps: () => calls.filter((call) => call.url.endsWith('/nitro-sec/bootstrap')).length };
};

describe('secure assets', () => {
    const nativeFetch = window.fetch;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-21T20:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
        window.fetch = nativeFetch;
        delete (window as any).__octaneClientMode;
    });

    it('keeps the session for the ttl the server sends, within 60 to 3600 seconds', async () => {
        const { resolveSessionTtlMs } = await import('./secure-assets');

        expect(resolveSessionTtlMs(undefined)).toBe(300_000);
        expect(resolveSessionTtlMs(900)).toBe(900_000);
        expect(resolveSessionTtlMs(10)).toBe(60_000);
        expect(resolveSessionTtlMs(99_999)).toBe(3_600_000);
        expect(resolveSessionTtlMs(0)).toBe(300_000);
        expect(resolveSessionTtlMs(-5)).toBe(300_000);
        expect(resolveSessionTtlMs(Number.NaN)).toBe(300_000);
        expect(resolveSessionTtlMs('900')).toBe(300_000);
    });

    it('loads files and calls the api in the clear when the server does not answer the bootstrap', async () => {
        const { module, calls, bootstraps } = await install(async () => new Response('Not Found', { status: 404 }));

        const file = await window.fetch(module.secureUrl('config', 'ui-config.json'));
        expect(await file.text()).toBe(`plain:${PLAIN_CONFIG}ui-config.json`);

        const api = await window.fetch(`${API}/api/auth/login`, { method: 'POST', body: '{"user":"a"}' });
        expect(await api.text()).toBe(`plain:${API}/api/auth/login`);

        const apiCall = calls.find((call) => call.url === `${API}/api/auth/login`);
        expect(new Headers(apiCall?.init?.headers).get('X-Nitro-Api')).toBeNull();
        expect(apiCall?.init?.body).toBe('{"user":"a"}');

        expect(bootstraps()).toBe(1);
    });

    it('tries the bootstrap again only after five minutes in the clear', async () => {
        const { module, bootstraps } = await install(async () => new Response('Not Found', { status: 404 }));

        await window.fetch(module.secureUrl('config', 'a.json'));
        vi.setSystemTime(Date.now() + 4 * 60 * 1000);
        await window.fetch(module.secureUrl('config', 'b.json'));
        expect(bootstraps()).toBe(1);

        vi.setSystemTime(Date.now() + 2 * 60 * 1000);
        await window.fetch(module.secureUrl('config', 'c.json'));
        expect(bootstraps()).toBe(2);
    });

    it('renews the key when the ttl sent by the server runs out', async () => {
        const key = await serverKey();
        const { bootstraps } = await install(async () => new Response(JSON.stringify({ key, ttl: 120 }), { status: 200 }));

        await window.fetch(`${API}/api/badges/custom`);
        vi.setSystemTime(Date.now() + 100 * 1000);
        await window.fetch(`${API}/api/badges/custom`);
        expect(bootstraps()).toBe(1);

        vi.setSystemTime(Date.now() + 30 * 1000);
        await window.fetch(`${API}/api/badges/custom`);
        expect(bootstraps()).toBe(2);
    });

    it('keeps the session key away from an /api/ path on another origin', async () => {
        const key = await serverKey();
        const { calls, bootstraps } = await install(async () => new Response(JSON.stringify({ key }), { status: 200 }));

        await window.fetch('https://elsewhere.test/api/auth/login', { method: 'POST', body: '{"user":"a"}' });

        const call = calls.find((entry) => entry.url === 'https://elsewhere.test/api/auth/login');
        expect(new Headers(call?.init?.headers).get('X-Nitro-Key')).toBeNull();
        expect(call?.init?.body).toBe('{"user":"a"}');
        expect(bootstraps()).toBe(0);
    });

    it('does not send a login in the clear once the server has spoken encrypted', async () => {
        const key = await serverKey();
        let available = true;
        const { calls } = await install(async () =>
            available ? new Response(JSON.stringify({ key, ttl: 60 }), { status: 200 }) : new Response('Down', { status: 503 })
        );

        await window.fetch(`${API}/api/badges/custom`);
        available = false;
        vi.setSystemTime(Date.now() + 120 * 1000);

        await expect(window.fetch(`${API}/api/auth/login`, { method: 'POST', body: '{"user":"a"}' })).rejects.toThrow('Secure API unavailable');
        expect(calls.some((call) => call.url === `${API}/api/auth/login`)).toBe(false);

        const other = await window.fetch(`${API}/api/badges/custom`);
        expect(await other.text()).toBe(`plain:${API}/api/badges/custom`);
    });

    it('asks for nothing encrypted when no client mode was loaded', async () => {
        vi.resetModules();
        const { getClientMode } = await import('./secure-assets');

        expect(getClientMode()).toMatchObject({ secureAssetsEnabled: false, secureApiEnabled: false });
    });
});
