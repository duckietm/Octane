import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVariablesWebApiClient, parseProfile, parseRetryAfter, parseStoredValue, VariablesWebApiError } from './variablesWebApi';

const READ_KEY = 'r'.repeat(43);
const WRITE_KEY = 'w'.repeat(43);
const ISO = '2026-10-05T10:00:00Z';
const SECONDS = Date.parse(ISO) / 1000;

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const makeClient = (fetchImpl: typeof fetch, overrides: Partial<Parameters<typeof createVariablesWebApiClient>[0]> = {}) =>
    createVariablesWebApiClient({ baseUrl: 'https://hotel.example/', roomId: 77, readKey: READ_KEY, writeKey: WRITE_KEY, fetchImpl, ...overrides });

const calls = (fetchImpl: ReturnType<typeof vi.fn>) => fetchImpl.mock.calls as unknown as [string, RequestInit][];
const headersOf = (init: RequestInit) => init.headers as Record<string, string>;

describe('createVariablesWebApiClient', () => {
    afterEach(() => vi.useRealTimers());

    it("reads with Habbo's read key header and never puts a key in the url", async () => {
        const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
            jsonResponse(200, { variables: [{ name: 'score', scope: 'user', has_value: true, text_connected: false }] })
        );

        const variables = await makeClient(fetchImpl as unknown as typeof fetch).listVariables();

        expect(variables).toEqual([{ name: 'score', scope: 'user', hasValue: true, textConnected: false }]);
        const [url, init] = calls(fetchImpl)[0];
        expect(url).toBe('https://hotel.example/api/public/rooms/77/variables/definitions');
        expect(String(url)).not.toContain(READ_KEY);
        expect(headersOf(init)['X-Wired-Read-Key']).toBe(READ_KEY);
        expect(headersOf(init)['X-Wired-Write-Key']).toBeUndefined();
        expect(headersOf(init).Authorization).toBeUndefined();
        expect(init.credentials).toBe('omit');
    });

    it("falls back to Habbo's names-only list when the server has no definitions", async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse(404, { error: 'wired.variables.unknown_endpoint' }))
            .mockResolvedValueOnce(jsonResponse(200, { users: ['coins'], furni: ['uses_left'], global: ['jackpot'] }));

        const variables = await makeClient(fetchImpl as unknown as typeof fetch).listVariables();

        expect(calls(fetchImpl)[1][0]).toBe('https://hotel.example/api/public/rooms/77/variables');
        expect(variables).toEqual([
            { name: 'coins', scope: 'user', hasValue: true, textConnected: false },
            { name: 'uses_left', scope: 'furni', hasValue: true, textConnected: false },
            { name: 'jackpot', scope: 'global', hasValue: true, textConnected: false }
        ]);
    });

    it('does not fall back when the room is unknown', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(404, { error: 'room.not_found' }));

        await expect(makeClient(fetchImpl as unknown as typeof fetch).listVariables()).rejects.toMatchObject({ code: 'room.not_found' });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('reads values as text and times as ISO 8601', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { value: '-12', creation_time: ISO, update_time: ISO }));

        await expect(makeClient(fetchImpl as unknown as typeof fetch).getEntry('user', 'score', 'users', 5)).resolves.toEqual({
            entityId: 5,
            value: -12,
            createdAt: SECONDS,
            updatedAt: SECONDS
        });
        expect(calls(fetchImpl)[0][0]).toBe('https://hotel.example/api/public/rooms/77/variables/user/score/users/5');
    });

    it('writes values as text with the write key header', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { value: '3', creation_time: ISO, update_time: ISO }));
        const client = makeClient(fetchImpl as unknown as typeof fetch);

        await client.putEntry('furni', 'lamp', 'wall-items', 9, 3);
        await client.patchEntry('user', 'score', 'users', 5, { value: 4 });
        await client.patchEntry('user', 'score', 'users', 5, { add: 2 });
        await client.patchGlobal('jackpot', { value: 100 });

        const sent = calls(fetchImpl);
        expect(sent[0][0]).toBe('https://hotel.example/api/public/rooms/77/variables/furni/lamp/wall-items/9');
        expect(sent[0][1].method).toBe('PUT');
        expect(sent[0][1].body).toBe('{"value":"3"}');
        expect(headersOf(sent[0][1])['X-Wired-Write-Key']).toBe(WRITE_KEY);
        expect(headersOf(sent[0][1])['X-Wired-Read-Key']).toBeUndefined();
        expect(headersOf(sent[0][1])['Content-Type']).toBe('application/json');
        expect(sent[1][1].body).toBe('{"value":"4"}');
        expect(sent[2][1].body).toBe('{"add":2}');
        expect(sent[3][0]).toBe('https://hotel.example/api/public/rooms/77/variables/global/jackpot');
        expect(sent[3][1].body).toBe('{"value":"100"}');
    });

    it('reads with the write key when there is no read key', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { value: '1', creation_time: ISO, update_time: ISO }));

        await makeClient(fetchImpl as unknown as typeof fetch, { readKey: '' }).getGlobal('jackpot');

        expect(headersOf(calls(fetchImpl)[0][1])['X-Wired-Read-Key']).toBe(WRITE_KEY);
    });

    it('refuses a write without a write key before calling the server', async () => {
        const fetchImpl = vi.fn();
        const client = makeClient(fetchImpl as unknown as typeof fetch, { writeKey: '' });

        await expect(client.deleteEntry('furni', 'lamp', 'furni', 9)).rejects.toMatchObject({ code: 'no_key' });
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(client.hasWriteAccess).toBe(false);
    });

    it("turns Habbo's error body into a typed error", async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(403, { error: 'wired.variables.bulk_delete_not_enabled' }));

        const error = await makeClient(fetchImpl as unknown as typeof fetch)
            .bulkDelete(['score'])
            .catch((caught) => caught);

        expect(error).toBeInstanceOf(VariablesWebApiError);
        expect(error).toMatchObject({ status: 403, code: 'wired.variables.bulk_delete_not_enabled' });
        expect(calls(fetchImpl)[0][1].body).toBe('{"variables":["score"]}');
    });

    it('reads the older Polaris error body and falls back to the status', async () => {
        const older = vi.fn(async () => jsonResponse(401, { error: { code: 'unauthorized', message: 'Unknown key' } }));
        const empty = vi.fn(async () => new Response('oops', { status: 403 }));

        await expect(makeClient(older as unknown as typeof fetch).getGlobal('x')).rejects.toMatchObject({ code: 'unauthorized' });
        await expect(makeClient(empty as unknown as typeof fetch).getGlobal('x')).rejects.toMatchObject({ code: 'wired.variables.key_invalid' });
    });

    it('stops calling the server after a 429 until Retry-After has passed', async () => {
        let now = 1_000_000;
        const fetchImpl = vi.fn(async () => jsonResponse(429, { error: 'wired.variables.too_many_requests' }, { 'Retry-After': '7' }));
        const client = makeClient(fetchImpl as unknown as typeof fetch, { now: () => now });

        await expect(client.getGlobalProfile()).rejects.toMatchObject({ code: 'wired.variables.too_many_requests', retryAfterSeconds: 7 });
        await expect(client.getGlobalProfile()).rejects.toMatchObject({ code: 'wired.variables.too_many_requests', retryAfterSeconds: 7 });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(client.blockedForSeconds).toBe(7);

        now += 7_001;
        fetchImpl.mockImplementationOnce(async () => jsonResponse(200, { variables: {} }));

        await expect(client.getGlobalProfile()).resolves.toEqual({ variables: {} });
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('aborts a request that runs past the timeout', async () => {
        vi.useFakeTimers();

        const fetchImpl = vi.fn(
            (_input: RequestInfo | URL, init?: RequestInit) =>
                new Promise<Response>((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
        );
        const pending = makeClient(fetchImpl as unknown as typeof fetch, { timeoutMs: 500 })
            .listVariables()
            .catch((caught) => caught);

        await vi.advanceTimersByTimeAsync(500);

        expect(await pending).toMatchObject({ code: 'timeout' });
    });

    it("pages with Habbo's query and reads its items", async () => {
        const fetchImpl = vi.fn(async () =>
            jsonResponse(200, {
                items: [{ id: 4, name: 'Bob', unique_id: '4', value: '30', creation_time: ISO, update_time: ISO }],
                page: 2,
                size: 100
            })
        );
        const client = makeClient(fetchImpl as unknown as typeof fetch);

        const page = await client.listEntries('furni', 'lamp', 'wall-items', 2, 500, 'value', 'desc');
        await client.listEntries('user', 'score', 'users', 1, 50);

        expect(calls(fetchImpl)[0][0]).toBe(
            'https://hotel.example/api/public/rooms/77/variables/furni/lamp/wall-items?order_by=value&order_dir=desc&page=2&size=100'
        );
        expect(calls(fetchImpl)[1][0]).toBe('https://hotel.example/api/public/rooms/77/variables/user/score/users?order_dir=asc&page=1&size=50');
        expect(page).toEqual({ page: 2, size: 100, entries: [{ entityId: 4, name: 'Bob', value: 30, createdAt: SECONDS, updatedAt: SECONDS }] });
    });

    it('reads the rate limit headers and treats 204 as success', async () => {
        const fetchImpl = vi.fn(
            async () => new Response(null, { status: 204, headers: { 'X-RateLimit-Limit': '60', 'X-RateLimit-Remaining': '59', 'X-RateLimit-Reset': '10' } })
        );
        const client = makeClient(fetchImpl as unknown as typeof fetch);

        await expect(client.deleteUserProfile('users', 3)).resolves.toBeUndefined();
        expect(client.rateLimit).toEqual({ limit: 60, remaining: 59, reset: 10 });
    });

    it("looks users up by name and reads Habbo's profile shape", async () => {
        const fetchImpl = vi.fn(async () =>
            jsonResponse(200, {
                user: { id: 4, name: 'Bob & Co', unique_id: '4' },
                variables: { score: { value: '12', creation_time: ISO, update_time: ISO } }
            })
        );

        const profile = await makeClient(fetchImpl as unknown as typeof fetch).getUserProfileByName('Bob & Co');

        expect(calls(fetchImpl)[0][0]).toBe('https://hotel.example/api/public/rooms/77/variables_profile/user/users?name=Bob%20%26%20Co');
        expect(profile).toEqual({
            targetKind: 'users',
            entityId: 4,
            name: 'Bob & Co',
            variables: { score: { value: 12, createdAt: SECONDS, updatedAt: SECONDS } }
        });
    });

    it('patches a profile with values as text', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { furni_bc: { id: 9 }, variables: {} }));

        const profile = await makeClient(fetchImpl as unknown as typeof fetch).patchProfile('furni', 'furni-bc', 9, { lamp: 2, old: null, flag: true });

        const [url, init] = calls(fetchImpl)[0];
        expect(url).toBe('https://hotel.example/api/public/rooms/77/variables_profile/furni/furni-bc/9');
        expect(init.method).toBe('PATCH');
        expect(init.body).toBe('{"variables":{"lamp":"2","old":null,"flag":true}}');
        expect(profile).toEqual({ targetKind: 'furni-bc', entityId: 9, variables: {} });
    });
});

describe('wire parsing', () => {
    it('reads stored values, leaving out a missing value', () => {
        expect(parseStoredValue({ value: '7', creation_time: ISO, update_time: 'garbage' })).toEqual({ value: 7, createdAt: SECONDS, updatedAt: 0 });
        expect(parseStoredValue({ creation_time: ISO, update_time: ISO })).toEqual({ createdAt: SECONDS, updatedAt: SECONDS });
        expect(parseStoredValue(null)).toEqual({ createdAt: 0, updatedAt: 0 });
    });

    it('names the owner of every profile kind', () => {
        expect(parseProfile({ pet: { id: 3, name: 'Rex' }, variables: {} })).toMatchObject({ targetKind: 'pets', entityId: 3, name: 'Rex' });
        expect(parseProfile({ bot: { id: 5 }, variables: {} })).toMatchObject({ targetKind: 'bots', entityId: 5 });
        expect(parseProfile({ wall_item: { id: 6 }, variables: {} })).toMatchObject({ targetKind: 'wall-items', entityId: 6 });
        expect(parseProfile({ wall_item_bc: { id: 8 }, variables: {} })).toMatchObject({ targetKind: 'wall-items-bc', entityId: 8 });
        expect(parseProfile({ variables: { jackpot: { value: '1', creation_time: ISO, update_time: ISO } } })).toEqual({
            variables: { jackpot: { value: 1, createdAt: SECONDS, updatedAt: SECONDS } }
        });
    });
});

describe('parseRetryAfter', () => {
    it('reads seconds and http dates', () => {
        expect(parseRetryAfter('12', 0)).toBe(12);
        expect(parseRetryAfter(new Date(30_000).toUTCString(), 0)).toBe(30);
        expect(parseRetryAfter('soon', 0)).toBeNull();
        expect(parseRetryAfter(null, 0)).toBeNull();
    });
});
