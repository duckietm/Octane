/**
 * Client for the Variables Web API (`/api/public/rooms/{roomId}/...`, see docs/wired/web-api.md), which
 * speaks Habbo's Wired Variables API: the read key in `X-Wired-Read-Key`, the write key in
 * `X-Wired-Write-Key`, values as text, times as ISO 8601 and errors as `{"error":"<code>"}`. Responses
 * are turned into the plain shapes below. After a 429 the client refuses further calls until
 * `Retry-After` has passed instead of retrying.
 */

export type WebApiVariableScope = 'user' | 'furni' | 'global';
export type WebApiUserTargetKind = 'users' | 'pets' | 'bots';
export type WebApiFurniTargetKind = 'furni' | 'wall-items' | 'furni-bc' | 'wall-items-bc';
export type WebApiTargetKind = WebApiUserTargetKind | WebApiFurniTargetKind;
export type WebApiHolderScope = Exclude<WebApiVariableScope, 'global'>;
/** Habbo's `order_by`; `id` leaves it out, so the server orders by holder id. */
export type WebApiSortField = 'id' | 'value' | 'creation_time' | 'update_time';
export type WebApiSortOrder = 'asc' | 'desc';

export interface WebApiVariable {
    name: string;
    scope: WebApiVariableScope;
    hasValue: boolean;
    textConnected: boolean;
}

/** A stored value. Times are unix seconds. */
export interface WebApiStoredValue {
    value?: number;
    createdAt: number;
    updatedAt: number;
}

export interface WebApiEntry extends WebApiStoredValue {
    entityId: number;
    name?: string;
}

export interface WebApiEntryPage {
    page: number;
    size: number;
    entries: WebApiEntry[];
}

export interface WebApiProfile {
    targetKind?: string;
    entityId?: number;
    name?: string;
    variables: Record<string, WebApiStoredValue>;
}

/** `add` is a Polaris addition to Habbo's API. */
export type WebApiValueChange = { value?: number } | { add: number };

export interface WebApiRateLimit {
    limit: number | null;
    remaining: number | null;
    reset: number | null;
}

/** Habbo's error codes, the Polaris additions, and the client's own. */
export type WebApiErrorCode =
    | 'wired.variables.invalid_target'
    | 'wired.variables.invalid_value'
    | 'wired.variables.bulk_delete_empty'
    | 'wired.variables.bulk_delete_invalid_variable'
    | 'wired.variables.batch_empty'
    | 'wired.variables.batch_limit_exceeded'
    | 'wired.variables.key_missing'
    | 'wired.variables.key_invalid'
    | 'wired.variables.api_disabled'
    | 'wired.variables.user_not_participating'
    | 'wired.variables.operation_not_allowed'
    | 'wired.variables.bulk_delete_not_enabled'
    | 'room.not_found'
    | 'wired.variables.not_found'
    | 'wired.variables.entity_not_found'
    | 'wired.variables.too_many_requests'
    | 'wired.variables.invalid_request'
    | 'wired.variables.bulk_delete_limit_exceeded'
    | 'wired.variables.unknown_endpoint'
    | 'wired.variables.method_not_allowed'
    | 'wired.variables.payload_too_large'
    | 'wired.variables.conflict'
    | 'wired.variables.internal_error'
    | 'timeout'
    | 'network'
    | 'no_key'
    | 'invalid_response';

export class VariablesWebApiError extends Error {
    public readonly status: number;
    public readonly code: WebApiErrorCode | string;
    public readonly retryAfterSeconds: number | null;

    constructor(status: number, code: WebApiErrorCode | string, message: string, retryAfterSeconds: number | null = null) {
        super(message);
        this.name = 'VariablesWebApiError';
        this.status = status;
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

export interface VariablesWebApiClientOptions {
    baseUrl: string;
    roomId: number;
    readKey?: string;
    writeKey?: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
    now?: () => number;
}

export const DEFAULT_WEB_API_TIMEOUT_MS = 10_000;
/** Used when a 429 comes without a readable `Retry-After`. */
export const DEFAULT_RETRY_AFTER_SECONDS = 10;
export const MAX_WEB_API_PAGE_SIZE = 100;
export const READ_KEY_HEADER = 'X-Wired-Read-Key';
export const WRITE_KEY_HEADER = 'X-Wired-Write-Key';

type KeyKind = 'read' | 'write';

interface RequestOptions {
    key: KeyKind;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
}

/** Habbo's wire shapes. */
interface WireStoredValue {
    value?: unknown;
    creation_time?: unknown;
    update_time?: unknown;
}

interface WirePagedItem extends WireStoredValue {
    id?: unknown;
    name?: unknown;
}

const PROFILE_OWNER_KINDS: Record<string, WebApiTargetKind> = {
    user: 'users',
    pet: 'pets',
    bot: 'bots',
    furni: 'furni',
    furni_bc: 'furni-bc',
    wall_item: 'wall-items',
    wall_item_bc: 'wall-items-bc'
};

export const parseRetryAfter = (value: string | null, nowMs: number): number | null => {
    if (!value) return null;

    const trimmed = value.trim();

    if (/^\d+$/.test(trimmed)) return Number(trimmed);

    const date = Date.parse(trimmed);

    if (Number.isNaN(date)) return null;

    return Math.max(0, Math.ceil((date - nowMs) / 1000));
};

/** A value as the API sends it (text like `"12"`), or `undefined` for a variable without one. */
export const parseWireValue = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);

    return undefined;
};

/** An ISO 8601 time as unix seconds; 0 when missing or unreadable. */
export const parseWireTime = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return 0;

    const millis = Date.parse(value);

    return Number.isNaN(millis) ? 0 : Math.max(0, Math.floor(millis / 1000));
};

export const parseStoredValue = (wire: WireStoredValue | null | undefined): WebApiStoredValue => {
    const value = parseWireValue(wire?.value);
    const stored: WebApiStoredValue = { createdAt: parseWireTime(wire?.creation_time), updatedAt: parseWireTime(wire?.update_time) };

    if (value !== undefined) stored.value = value;

    return stored;
};

const parseVariables = (wire: unknown): Record<string, WebApiStoredValue> => {
    const variables: Record<string, WebApiStoredValue> = {};

    if (!wire || typeof wire !== 'object') return variables;

    for (const [name, stored] of Object.entries(wire as Record<string, WireStoredValue>)) variables[name] = parseStoredValue(stored);

    return variables;
};

/** A Habbo profile (`{"user":{id,name},"variables":{...}}`, owner field named after the kind) as a plain one. */
export const parseProfile = (wire: unknown): WebApiProfile => {
    const body = (wire && typeof wire === 'object' ? wire : {}) as Record<string, unknown>;
    const profile: WebApiProfile = { variables: parseVariables(body.variables) };

    for (const [field, kind] of Object.entries(PROFILE_OWNER_KINDS)) {
        const owner = body[field] as { id?: unknown; name?: unknown } | undefined;

        if (!owner || typeof owner !== 'object') continue;

        profile.targetKind = kind;

        if (typeof owner.id === 'number') profile.entityId = owner.id;
        if (typeof owner.name === 'string') profile.name = owner.name;

        break;
    }

    return profile;
};

const readHeaderNumber = (headers: Headers, name: string): number | null => {
    const value = headers.get(name);

    if (value === null || value.trim() === '') return null;

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
};

const segment = (value: string | number): string => encodeURIComponent(String(value));

/** Habbo's `{"error":"<code>"}`; the older Polaris `{"error":{"code","message"}}` is read too. */
const readErrorCode = async (response: Response): Promise<string | null> => {
    try {
        const body = (await response.json()) as { error?: unknown };
        const error = body?.error;

        if (typeof error === 'string') return error;
        if (error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string') return (error as { code: string }).code;

        return null;
    } catch {
        return null;
    }
};

const STATUS_CODES: Record<number, WebApiErrorCode> = {
    400: 'wired.variables.invalid_request',
    401: 'wired.variables.key_invalid',
    403: 'wired.variables.key_invalid',
    404: 'wired.variables.not_found',
    409: 'wired.variables.conflict',
    413: 'wired.variables.payload_too_large',
    429: 'wired.variables.too_many_requests'
};

/** A value as Habbo's API takes it: text. */
const wireValue = (value: number): string => String(Math.trunc(value));

const wireProfileValues = (variables: Record<string, number | null | true>): Record<string, string | null | true> =>
    Object.fromEntries(Object.entries(variables).map(([name, value]) => [name, typeof value === 'number' ? wireValue(value) : value]));

const wireChange = (change: WebApiValueChange): Record<string, unknown> =>
    'add' in change ? { add: change.add } : change.value === undefined ? {} : { value: wireValue(change.value) };

export const createVariablesWebApiClient = (options: VariablesWebApiClientOptions) => {
    const { baseUrl, roomId, readKey = '', writeKey = '', timeoutMs = DEFAULT_WEB_API_TIMEOUT_MS } = options;
    const fetchImpl = options.fetchImpl ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
    const now = options.now ?? (() => Date.now());
    const roomBase = `${baseUrl.replace(/\/+$/, '')}/api/public/rooms/${segment(roomId)}`;

    let blockedUntil = 0;
    let rateLimit: WebApiRateLimit = { limit: null, remaining: null, reset: null };

    /** Reads go in the read header (the write key opens reads too), writes in the write header. */
    const keyHeader = (kind: KeyKind): [string, string] | null => {
        if (kind === 'write') return writeKey ? [WRITE_KEY_HEADER, writeKey] : null;

        const key = readKey || writeKey;

        return key ? [READ_KEY_HEADER, key] : null;
    };

    const request = async <T>(method: string, path: string, requestOptions: RequestOptions): Promise<T> => {
        const current = now();

        if (blockedUntil > current) {
            const seconds = Math.ceil((blockedUntil - current) / 1000);

            throw new VariablesWebApiError(429, 'wired.variables.too_many_requests', 'Too many requests', seconds);
        }

        const key = keyHeader(requestOptions.key);

        if (!key) throw new VariablesWebApiError(0, 'no_key', requestOptions.key === 'write' ? 'A write key is needed' : 'A read key is needed');

        const query = Object.entries(requestOptions.query ?? {})
            .filter(([, value]) => value !== undefined && value !== '')
            .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
            .join('&');
        const url = `${roomBase}${path}${query ? `?${query}` : ''}`;
        const headers: Record<string, string> = { Accept: 'application/json', [key[0]]: key[1] };
        const hasBody = requestOptions.body !== undefined;

        if (hasBody) headers['Content-Type'] = 'application/json';

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response: Response;

        try {
            response = await fetchImpl(url, {
                method,
                headers,
                body: hasBody ? JSON.stringify(requestOptions.body) : undefined,
                signal: controller.signal,
                credentials: 'omit',
                cache: 'no-store',
                referrerPolicy: 'no-referrer'
            });
        } catch (error) {
            if (controller.signal.aborted) throw new VariablesWebApiError(0, 'timeout', 'The request timed out');

            throw new VariablesWebApiError(0, 'network', error instanceof Error && error.message ? error.message : 'Network error');
        } finally {
            clearTimeout(timer);
        }

        rateLimit = {
            limit: readHeaderNumber(response.headers, 'X-RateLimit-Limit'),
            remaining: readHeaderNumber(response.headers, 'X-RateLimit-Remaining'),
            reset: readHeaderNumber(response.headers, 'X-RateLimit-Reset')
        };

        if (!response.ok) {
            const code = (await readErrorCode(response)) ?? STATUS_CODES[response.status] ?? 'wired.variables.internal_error';
            let retryAfter: number | null = null;

            if (response.status === 429) {
                retryAfter = parseRetryAfter(response.headers.get('Retry-After'), now()) ?? DEFAULT_RETRY_AFTER_SECONDS;
                blockedUntil = now() + retryAfter * 1000;
            }

            throw new VariablesWebApiError(response.status, code, code, retryAfter);
        }

        if (response.status === 204) return undefined as T;

        try {
            return (await response.json()) as T;
        } catch {
            throw new VariablesWebApiError(response.status, 'invalid_response', 'The server sent an unreadable response');
        }
    };

    const variablePath = (scope: WebApiHolderScope, name: string) => `/variables/${segment(scope)}/${segment(name)}`;
    const entryPath = (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number) =>
        `${variablePath(scope, name)}/${segment(targetKind)}/${segment(entityId)}`;

    /** Habbo's names-only list, for a server without the Polaris definitions endpoint (or an older Polaris list). */
    const listVariableNames = async (): Promise<WebApiVariable[]> => {
        const body = await request<Record<string, unknown>>('GET', '/variables', { key: 'read' });

        if (Array.isArray(body?.variables)) return body.variables as WebApiVariable[];

        const variables: WebApiVariable[] = [];
        const groups: [string, WebApiVariableScope][] = [
            ['users', 'user'],
            ['furni', 'furni'],
            ['global', 'global']
        ];

        for (const [field, scope] of groups) {
            const names = body?.[field];

            if (!Array.isArray(names)) continue;

            for (const name of names) if (typeof name === 'string') variables.push({ name, scope, hasValue: true, textConnected: false });
        }

        return variables;
    };

    return {
        get rateLimit(): WebApiRateLimit {
            return rateLimit;
        },
        get blockedForSeconds(): number {
            return Math.max(0, Math.ceil((blockedUntil - now()) / 1000));
        },
        hasReadAccess: !!(readKey || writeKey),
        hasWriteAccess: !!writeKey,

        /** The variables with their settings (Polaris `GET /variables/definitions`), else Habbo's names. */
        listVariables: async (): Promise<WebApiVariable[]> => {
            try {
                const body = await request<{ variables?: { name?: unknown; scope?: unknown; has_value?: unknown; text_connected?: unknown }[] }>(
                    'GET',
                    '/variables/definitions',
                    { key: 'read' }
                );

                return (body?.variables ?? [])
                    .filter((variable) => typeof variable?.name === 'string' && ['user', 'furni', 'global'].includes(variable.scope as string))
                    .map((variable) => ({
                        name: variable.name as string,
                        scope: variable.scope as WebApiVariableScope,
                        hasValue: variable.has_value !== false,
                        textConnected: variable.text_connected === true
                    }));
            } catch (error) {
                if (error instanceof VariablesWebApiError && error.status === 404 && error.code !== 'room.not_found') return listVariableNames();

                throw error;
            }
        },

        getEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number) =>
            request<WireStoredValue>('GET', entryPath(scope, name, targetKind, entityId), { key: 'read' }).then((body) => ({
                entityId,
                ...parseStoredValue(body)
            })),

        putEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number, value?: number) =>
            request<WireStoredValue>('PUT', entryPath(scope, name, targetKind, entityId), {
                key: 'write',
                body: value === undefined ? {} : { value: wireValue(value) }
            }).then((body) => ({ entityId, ...parseStoredValue(body) })),

        patchEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number, change: WebApiValueChange) =>
            request<WireStoredValue>('PATCH', entryPath(scope, name, targetKind, entityId), { key: 'write', body: wireChange(change) }).then((body) => ({
                entityId,
                ...parseStoredValue(body)
            })),

        deleteEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number) =>
            request<void>('DELETE', entryPath(scope, name, targetKind, entityId), { key: 'write' }),

        listEntries: (
            scope: WebApiHolderScope,
            name: string,
            targetKind: WebApiTargetKind,
            page: number,
            size: number,
            orderBy: WebApiSortField = 'id',
            orderDir: WebApiSortOrder = 'asc'
        ): Promise<WebApiEntryPage> =>
            request<{ items?: WirePagedItem[]; page?: unknown; size?: unknown }>('GET', `${variablePath(scope, name)}/${segment(targetKind)}`, {
                key: 'read',
                query: {
                    order_by: orderBy === 'id' ? undefined : orderBy,
                    order_dir: orderDir,
                    page,
                    size: Math.min(Math.max(1, size), MAX_WEB_API_PAGE_SIZE)
                }
            }).then((body) => ({
                page: typeof body?.page === 'number' ? body.page : page,
                size: typeof body?.size === 'number' ? body.size : size,
                entries: (body?.items ?? [])
                    .filter((item) => typeof item?.id === 'number')
                    .map((item) => ({
                        entityId: item.id as number,
                        ...(typeof item.name === 'string' ? { name: item.name } : {}),
                        ...parseStoredValue(item)
                    }))
            })),

        countEntries: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind) =>
            request<{ count: number }>('GET', `${variablePath(scope, name)}/${segment(targetKind)}/count`, { key: 'read' }).then((body) =>
                typeof body?.count === 'number' ? body.count : 0
            ),

        /** Habbo's body; Polaris answers with how many holders lost each variable. */
        bulkDelete: (names: string[]) =>
            request<{ deleted?: Record<string, number> } | undefined>('POST', '/variables/bulk-delete', { key: 'write', body: { variables: names } }).then(
                (body) => body?.deleted ?? {}
            ),

        getGlobal: (name: string) => request<WireStoredValue>('GET', `/variables/global/${segment(name)}`, { key: 'read' }).then(parseStoredValue),

        patchGlobal: (name: string, change: WebApiValueChange) =>
            request<WireStoredValue>('PATCH', `/variables/global/${segment(name)}`, { key: 'write', body: wireChange(change) }).then(parseStoredValue),

        getUserProfileByName: (username: string) =>
            request<unknown>('GET', '/variables_profile/user/users', { key: 'read', query: { name: username } }).then(parseProfile),

        getProfile: (scope: WebApiHolderScope, targetKind: WebApiTargetKind, entityId: number) =>
            request<unknown>('GET', `/variables_profile/${segment(scope)}/${segment(targetKind)}/${segment(entityId)}`, { key: 'read' }).then(parseProfile),

        /** `null` deletes a value; `true` (Polaris addition) gives a variable without a value. */
        patchProfile: (scope: WebApiHolderScope, targetKind: WebApiTargetKind, entityId: number, variables: Record<string, number | null | true>) =>
            request<unknown>('PATCH', `/variables_profile/${segment(scope)}/${segment(targetKind)}/${segment(entityId)}`, {
                key: 'write',
                body: { variables: wireProfileValues(variables) }
            }).then(parseProfile),

        deleteUserProfile: (targetKind: WebApiUserTargetKind, entityId: number) =>
            request<void>('DELETE', `/variables_profile/user/${segment(targetKind)}/${segment(entityId)}`, { key: 'write' }),

        getGlobalProfile: () => request<unknown>('GET', '/variables_profile/global', { key: 'read' }).then(parseProfile),

        patchGlobalProfile: (variables: Record<string, number>) =>
            request<unknown>('PATCH', '/variables_profile/global', { key: 'write', body: { variables: wireProfileValues(variables) } }).then(parseProfile)
    };
};

export type VariablesWebApiClient = ReturnType<typeof createVariablesWebApiClient>;
