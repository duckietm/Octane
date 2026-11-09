import { describe, expect, it } from 'vitest';
import {
    buildIniSnippet,
    cleanPathAnswer,
    generateMasterKey,
    isPlaceholderHost,
    isPlaceholderSecret,
    normalizeSecureAnswer,
    patchClientMode,
    patchIniValues,
    probeBootstrap,
    readIniValue,
    resolveIniValues
} from '../../scripts/secure-setup.mjs';

describe('secure setup', () => {
    it.each([
        ['', 'on'],
        ['y', 'on'],
        ['ON', 'on'],
        ['n', 'off'],
        ['off', 'off'],
        ['maybe', null]
    ])('normalizes "%s" to %s', (input, expected) => {
        expect(normalizeSecureAnswer(input)).toBe(expected);
    });

    it.each([
        ['"E:\\Emu\\config.ini"', 'E:\\Emu\\config.ini'],
        ["  'a b/c.ini'  ", 'a b/c.ini'],
        ['plain.ini', 'plain.ini'],
        ['"unbalanced', '"unbalanced']
    ])('strips the quotes of a pasted path %s', (input, expected) => {
        expect(cleanPathAnswer(input)).toBe(expected);
    });

    it.each([
        ['https://nitro.example.com:2096', true],
        ['https://example.org', true],
        ['not a url', true],
        ['https://myexample.com', false],
        ['http://localhost:2096', false]
    ])('flags %s as placeholder=%s', (url, expected) => {
        expect(isPlaceholderHost(url)).toBe(expected);
    });

    it('generates a 256 bit key that differs every time', () => {
        const first = generateMasterKey();

        expect(first).toMatch(/^[0-9a-f]{64}$/);
        expect(generateMasterKey()).not.toBe(first);
    });

    it.each([
        ['', true],
        ['   ', true],
        ['change-me-to-a-long-random-secret', true],
        ['Change_this', true],
        ['9f2c1d', false]
    ])('treats "%s" as placeholder=%s', (value, expected) => {
        expect(isPlaceholderSecret(value)).toBe(expected);
    });

    it('patches the two flags in client-mode and reports whether anything moved', () => {
        const base = { distObfuscationEnabled: true, secureAssetsEnabled: true, secureApiEnabled: true, apiBaseUrl: 'https://a' };

        const off = patchClientMode(base, { assets: true, api: false });

        expect(off.changed).toBe(true);
        expect(off.clientMode).toEqual({ ...base, secureApiEnabled: false });
        expect(patchClientMode(base, { assets: true, api: true }).changed).toBe(false);
    });

    describe('config.ini', () => {
        const ini = [
            '# emulator',
            'ws.port=2096',
            'nitro.secure.assets.enabled=false',
            '# nitro.secure.api.enabled=commented',
            'nitro.secure.api.enabled=false',
            'nitro.secure.master_key=change-me-to-a-long-random-secret',
            ''
        ].join('\r\n');

        it('reads the last value of a key and ignores comments', () => {
            expect(readIniValue(ini, 'nitro.secure.api.enabled')).toBe('false');
            expect(readIniValue(ini, 'missing.key')).toBeNull();
        });

        it('rewrites the lines in place and keeps CRLF', () => {
            const { text, changes } = patchIniValues(ini, { 'nitro.secure.assets.enabled': 'true', 'nitro.secure.master_key': 'abc' });

            expect(changes).toEqual(['nitro.secure.assets.enabled', 'nitro.secure.master_key']);
            expect(text).toContain('nitro.secure.assets.enabled=true\r\n');
            expect(text).toContain('nitro.secure.master_key=abc\r\n');
            expect(text).toContain('# nitro.secure.api.enabled=commented');
            expect(text).not.toMatch(/[^\r]\n/);
        });

        it('appends the keys the file does not have, before the final newline', () => {
            const { text, changes } = patchIniValues('ws.port=2096\n', { 'nitro.secure.api.enabled': 'true' });

            expect(changes).toEqual(['nitro.secure.api.enabled']);
            expect(text.endsWith('nitro.secure.api.enabled=true\n')).toBe(true);
            expect(text.startsWith('ws.port=2096\n')).toBe(true);
        });

        it('changes nothing when the file already holds the values', () => {
            const first = patchIniValues(ini, { 'nitro.secure.assets.enabled': 'true' });
            const second = patchIniValues(first.text, { 'nitro.secure.assets.enabled': 'true' });

            expect(second.changes).toEqual([]);
            expect(second.text).toBe(first.text);
        });

        it('replaces a placeholder master key but keeps one somebody chose', () => {
            const fresh = resolveIniValues(ini, { assets: true, api: true });

            expect(fresh.keptMasterKey).toBe(false);
            expect(fresh.values['nitro.secure.master_key']).toMatch(/^[0-9a-f]{64}$/);

            const chosen = resolveIniValues('nitro.secure.master_key=my-own-secret\n', { assets: true, api: true });

            expect(chosen.keptMasterKey).toBe(true);
            expect(chosen.values).not.toHaveProperty('nitro.secure.master_key');
        });

        it('does not mint a key when secure mode is off', () => {
            const { values } = resolveIniValues(null, { assets: false, api: false });

            expect(values).toEqual({ 'nitro.secure.assets.enabled': 'false', 'nitro.secure.api.enabled': 'false' });
        });

        it('prints the values as a pasteable snippet', () => {
            const snippet = buildIniSnippet({ 'nitro.secure.assets.enabled': 'true', 'nitro.secure.master_key': 'k' });

            expect(snippet.split('\n').slice(1)).toEqual(['nitro.secure.assets.enabled=true', 'nitro.secure.master_key=k']);
        });
    });

    describe('bootstrap probe', () => {
        const reply = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status, headers: { 'X-Nitro-Key-Fp': 'abcd' } });

        it('sends a P-256 key to the bootstrap endpoint and reads the answer', async () => {
            let seen: { url: string; key: string } | null = null;

            const state = await probeBootstrap('https://nitro.example.com:2096/', (async (url: string, init: RequestInit) => {
                seen = { url, key: JSON.parse(String(init.body)).key };

                return new Response(JSON.stringify({ key: 'server' }), { status: 200, headers: { 'X-Nitro-Key-Fp': 'abcd' } });
            }) as typeof fetch);

            expect(state).toEqual({ state: 'ready', fingerprint: 'abcd' });
            expect(seen!.url).toBe('https://nitro.example.com:2096/nitro-sec/bootstrap');
            expect(Buffer.from(seen!.key, 'base64').length).toBe(91);
        });

        it('says rejected when the server answers with an error or no key', async () => {
            expect((await probeBootstrap('http://x', reply(404, {}) as typeof fetch)).state).toBe('rejected');
            expect((await probeBootstrap('http://x', reply(200, {}) as typeof fetch)).state).toBe('rejected');
        });

        it('says unreachable when the request throws', async () => {
            const state = await probeBootstrap('http://x', (async () => {
                throw new Error('ECONNREFUSED');
            }) as typeof fetch);

            expect(state).toEqual({ state: 'unreachable', detail: 'ECONNREFUSED' });
        });
    });
});
