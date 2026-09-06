type SecureSession = {
    publicKey: string;
    key: CryptoKey;
    fingerprint: string;
};

export type OctaneClientMode = {
    distObfuscationEnabled: boolean;
    secureAssetsEnabled: boolean;
    secureApiEnabled: boolean;
    apiBaseUrl?: string;
    plainConfigBaseUrl?: string;
    plainGamedataBaseUrl?: string;
};

const CLIENT_MODE_DEFAULTS: OctaneClientMode = {
    distObfuscationEnabled: true,
    secureAssetsEnabled: true,
    secureApiEnabled: true
};

const getDeployBaseUrl = (): string => {
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

const isDebugEnabled = (): boolean => {
    try {
        const search = new URLSearchParams(window.location.search);

        return search.get('secureDebug') === '1' || localStorage.getItem('nitro.secure.debug') === '1';
    } catch {
        return false;
    }
};

const setDebugState = (message: string): void => {
    try {
        (window as any).__octaneSecureDebug = message;
        const log = Array.isArray((window as any).__octaneSecureDebugLog) ? (window as any).__octaneSecureDebugLog : [];

        log.push(message);
        (window as any).__octaneSecureDebugLog = log.slice(-50);

        if (!isDebugEnabled()) return;

        const existing = document.getElementById('octane-secure-debug');

        if (existing) {
            existing.textContent = (window as any).__octaneSecureDebugLog.slice(-8).join('\n');
            return;
        }

        const node = document.createElement('div');
        node.id = 'octane-secure-debug';
        node.style.position = 'fixed';
        node.style.left = '8px';
        node.style.bottom = '8px';
        node.style.zIndex = '2147483647';
        node.style.padding = '6px 8px';
        node.style.maxWidth = '70vw';
        node.style.background = 'rgba(0,0,0,0.85)';
        node.style.color = '#00ff90';
        node.style.font = '12px monospace';
        node.style.whiteSpace = 'pre-wrap';
        node.style.pointerEvents = 'none';
        node.textContent = (window as any).__octaneSecureDebugLog.slice(-8).join('\n');
        document.body.appendChild(node);
    } catch {}
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let secureSessionPromise: Promise<SecureSession> = null;
let installed = false;
const secureResponseCache = new Map<string, Promise<Response>>();
const SECURE_RESPONSE_CACHE_LIMIT = 128;
let secureSessionCreatedAt = 0;
const SECURE_SESSION_TTL_MS = 5 * 60 * 1000;
const REKEY_ENDPOINTS = new Set(['/api/auth/login', '/api/auth/remember', '/api/auth/logout']);

let clientModeCache: OctaneClientMode | null = null;

export const getClientMode = (): OctaneClientMode => {
    if (clientModeCache) return clientModeCache;

    try {
        const configured = (window as any).__octaneClientMode;

        if (configured && typeof configured === 'object') {
            clientModeCache = {
                distObfuscationEnabled: configured.distObfuscationEnabled !== false,
                secureAssetsEnabled: configured.secureAssetsEnabled !== false,
                secureApiEnabled: configured.secureApiEnabled !== false,
                apiBaseUrl: typeof configured.apiBaseUrl === 'string' ? configured.apiBaseUrl : '',
                plainConfigBaseUrl: typeof configured.plainConfigBaseUrl === 'string' ? configured.plainConfigBaseUrl : '',
                plainGamedataBaseUrl: typeof configured.plainGamedataBaseUrl === 'string' ? configured.plainGamedataBaseUrl : ''
            };

            return clientModeCache;
        }
    } catch {}

    return CLIENT_MODE_DEFAULTS;
};

const bytesToBase64 = (bytes: ArrayBuffer): string => {
    let binary = '';
    const view = new Uint8Array(bytes);

    for (let index = 0; index < view.length; index++) binary += String.fromCharCode(view[index]);

    return btoa(binary);
};

const randomHex = (byteLength: number): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(byteLength));

    return Array.from(bytes)
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
};

const hexValue = (code: number): number => {
    if (code >= 48 && code <= 57) return code - 48;
    if (code >= 65 && code <= 70) return code - 55;
    if (code >= 97 && code <= 102) return code - 87;

    return -1;
};

const hexToBytes = (hex: string): Uint8Array => {
    const normalized = hex.trim();

    if (normalized.length % 2 !== 0) throw new Error('Invalid encrypted hex payload.');

    const bytes = new Uint8Array(normalized.length / 2);

    for (let index = 0; index < bytes.length; index++) {
        const high = hexValue(normalized.charCodeAt(index * 2));
        const low = hexValue(normalized.charCodeAt(index * 2 + 1));

        if (high < 0 || low < 0) throw new Error('Invalid encrypted hex payload.');

        bytes[index] = (high << 4) | low;
    }

    return bytes;
};

const deriveAesKey = async (privateKey: CryptoKey, serverKeyBase64: string): Promise<{ key: CryptoKey; fingerprint: string }> => {
    const serverBytes = Uint8Array.from(atob(serverKeyBase64), (char) => char.charCodeAt(0));
    const serverKey = await crypto.subtle.importKey('spki', serverBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

    const secret = await crypto.subtle.deriveBits({ name: 'ECDH', public: serverKey }, privateKey, 256);
    const salt = textEncoder.encode('nitro-secure-assets-v1');
    const material = new Uint8Array(secret.byteLength + salt.length);
    material.set(new Uint8Array(secret), 0);
    material.set(salt, secret.byteLength);

    const hash = await crypto.subtle.digest('SHA-256', material);
    const fingerprintHash = await crypto.subtle.digest('SHA-256', hash);
    const fingerprint = Array.from(new Uint8Array(fingerprintHash).slice(0, 8))
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');

    return {
        key: await crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']),
        fingerprint
    };
};

const getApiBase = (): string => {
    const mode = getClientMode();
    if (typeof mode.apiBaseUrl === 'string' && mode.apiBaseUrl.length) return mode.apiBaseUrl.replace(/\/$/, '');

    const configured = (window as any).OctaneSecureApiUrl;

    if (typeof configured === 'string' && configured.length) return configured.replace(/\/$/, '');

    return window.location.origin;
};

const getPlainAssetBase = (kind: 'config' | 'gamedata'): string => {
    const mode = getClientMode();
    const configured = kind === 'config' ? mode.plainConfigBaseUrl : mode.plainGamedataBaseUrl;

    if (typeof configured === 'string' && configured.length) return configured.endsWith('/') ? configured : `${configured}/`;

    if (kind === 'config') return new URL('configuration/', getDeployBaseUrl()).toString();

    return `${window.location.origin}/octane/gamedata/`;
};

const mapSecureAssetRequestToPlainUrl = (requestUrl: string): string => {
    const url = new URL(requestUrl, window.location.href);
    const kind = (url.searchParams.get('kind') || 'config') as 'config' | 'gamedata';
    const file = (url.searchParams.get('file') || '').replace(/^[\\/]+/, '');
    const plainUrl = new URL(file, getPlainAssetBase(kind));
    const cacheBust = url.searchParams.get('v');

    if (cacheBust) plainUrl.searchParams.set('v', cacheBust);

    return plainUrl.toString();
};

export const secureUrl = (kind: 'config' | 'gamedata', file: string, cacheBust = false): string => {
    if (!getClientMode().secureAssetsEnabled) {
        const plainUrl = new URL(file.replace(/^\/+/, ''), getPlainAssetBase(kind));

        if (cacheBust) plainUrl.searchParams.set('v', Date.now().toString(36));

        return plainUrl.toString();
    }

    const base = getApiBase();
    const version = cacheBust ? `&v=${encodeURIComponent(Date.now().toString(36))}` : '';

    return `${base}/nitro-sec/file?kind=${encodeURIComponent(kind)}&file=${encodeURIComponent(file)}${version}`;
};

export const configFileUrl = (file: string, cacheBust = false): string => {
    if (getClientMode().secureAssetsEnabled) return secureUrl('config', file, cacheBust);

    const plainUrl = new URL(file.replace(/^\/+/, ''), getPlainAssetBase('config'));

    if (cacheBust) plainUrl.searchParams.set('v', Date.now().toString(36));

    return plainUrl.toString();
};

const createSecureSession = async (): Promise<SecureSession> => {
    setDebugState('secure: generating ECDH session');

    const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const publicKey = await crypto.subtle.exportKey('spki', pair.publicKey);
    const response = await fetch(`${getApiBase()}/nitro-sec/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: bytesToBase64(publicKey) })
    });

    if (!response.ok) throw new Error(`Secure bootstrap failed: HTTP ${response.status}`);

    const fingerprint = response.headers.get('X-Nitro-Key-Fp') || 'none';
    const payload = await response.json();
    const serverKey = typeof payload.key === 'string' ? payload.key : '';
    const clientPublicKey = bytesToBase64(publicKey);

    if (!serverKey) throw new Error('Secure bootstrap returned an invalid server key.');

    setDebugState(`secure: bootstrap ok fp=${fingerprint}`);

    const derived = await deriveAesKey(pair.privateKey, serverKey);

    secureSessionCreatedAt = Date.now();

    return { publicKey: clientPublicKey, key: derived.key, fingerprint: derived.fingerprint };
};

const clearSecureSession = (clearCache = false): void => {
    secureSessionPromise = null;
    secureSessionCreatedAt = 0;
    if (clearCache) secureResponseCache.clear();
};

export const getSecureSession = (): Promise<SecureSession> => {
    if (secureSessionPromise && secureSessionCreatedAt && Date.now() - secureSessionCreatedAt > SECURE_SESSION_TTL_MS) {
        setDebugState('secure: session expired, rotating');
        clearSecureSession();
    }

    if (!secureSessionPromise) secureSessionPromise = createSecureSession();

    return secureSessionPromise;
};

const decryptResponse = async (session: SecureSession, response: Response): Promise<Response> => {
    setDebugState(`secure: decrypt start status=${response.status}`);
    const bytes = hexToBytes(await response.text());

    if (bytes.length < 13) throw new Error('Encrypted response is too short.');

    const iv = bytes.slice(0, 12);
    const payload = bytes.slice(12);
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, session.key, payload);
    const headers = new Headers(response.headers);

    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.delete('X-Nitro-Sec');

    const text = textDecoder.decode(clear);
    setDebugState(`secure: decrypt ok bytes=${bytes.length}`);

    return new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
};

const cloneCachedResponse = async (responsePromise: Promise<Response>): Promise<Response> => {
    const response = await responsePromise;

    return response.clone();
};

const cacheSecureResponse = (cacheKey: string, responsePromise: Promise<Response>): void => {
    secureResponseCache.set(cacheKey, responsePromise);

    responsePromise.catch(() => secureResponseCache.delete(cacheKey));

    while (secureResponseCache.size > SECURE_RESPONSE_CACHE_LIMIT) {
        const oldestKey = secureResponseCache.keys().next().value;

        if (!oldestKey) break;

        secureResponseCache.delete(oldestKey);
    }
};

const normalizeSecureCacheKey = (requestUrl: string): string => {
    try {
        const url = new URL(requestUrl, window.location.href);

        if (!url.pathname.includes('/nitro-sec/file')) return requestUrl;

        const kind = url.searchParams.get('kind') || '';
        if (kind === 'config') return requestUrl;

        const file = (url.searchParams.get('file') || '')
            .replace(/^[\\/]+/, '')
            .split('?')[0]
            .split('#')[0];

        return `${url.origin}${url.pathname}?kind=${kind}&file=${file}`;
    } catch {
        return requestUrl;
    }
};

const bytesToHex = (bytes: Uint8Array): string => {
    let output = '';

    for (let index = 0; index < bytes.length; index++) output += bytes[index].toString(16).padStart(2, '0');

    return output;
};

const encryptBytes = async (session: SecureSession, clear: ArrayBuffer): Promise<string> => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, session.key, clear));
    const out = new Uint8Array(iv.length + encrypted.length);

    out.set(iv, 0);
    out.set(encrypted, iv.length);

    return bytesToHex(out);
};

const isApiUrl = (requestUrl: string): boolean => {
    try {
        return new URL(requestUrl, window.location.href).pathname.startsWith('/api/');
    } catch {
        return requestUrl.startsWith('/api/');
    }
};

const readRequestBody = async (input: RequestInfo | URL, init: RequestInit | undefined, method: string): Promise<ArrayBuffer | null> => {
    if (method === 'GET' || method === 'HEAD') return null;
    if (init?.body !== undefined) {
        if (typeof init.body === 'string') return textEncoder.encode(init.body).buffer;
        if (init.body instanceof ArrayBuffer) return init.body;
        if (ArrayBuffer.isView(init.body)) return init.body.buffer.slice(init.body.byteOffset, init.body.byteOffset + init.body.byteLength);
        if (init.body instanceof Blob) return init.body.arrayBuffer();
    }

    if (input instanceof Request) return input.clone().arrayBuffer();

    return null;
};

const buildSecureApiEnvelope = (requestUrl: string, method: string, clearBody: ArrayBuffer | null): ArrayBuffer | null => {
    if (!clearBody) return null;

    const url = new URL(requestUrl, window.location.href);
    const envelope = {
        ts: Date.now(),
        nonce: randomHex(16),
        method,
        path: `${url.pathname}${url.search}`,
        body: bytesToBase64(clearBody)
    };

    return textEncoder.encode(JSON.stringify(envelope)).buffer;
};

const scheduleSecureRekey = (): void => {
    queueMicrotask(() => {
        clearSecureSession();
    });
};

export const installSecureFetch = (): void => {
    if (installed) return;

    const mode = getClientMode();

    if (!mode.secureAssetsEnabled && !mode.secureApiEnabled) {
        installed = true;
        return;
    }

    installed = true;
    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (requestUrl.includes('/nitro-sec/file')) {
            if (!getClientMode().secureAssetsEnabled) return nativeFetch(mapSecureAssetRequestToPlainUrl(requestUrl), init);

            const method = init?.method || (input instanceof Request ? input.method : 'GET');
            const cacheKey = method.toUpperCase() === 'GET' ? normalizeSecureCacheKey(requestUrl) : null;

            if (cacheKey && secureResponseCache.has(cacheKey)) return cloneCachedResponse(secureResponseCache.get(cacheKey));

            const responsePromise = (async () => {
                const session = await getSecureSession();
                setDebugState(`secure: fetching ${requestUrl}`);
                const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));

                headers.set('X-Nitro-Key', session.publicKey);

                const response = await nativeFetch(input, { ...init, headers });
                setDebugState(
                    `secure: response ${response.status} encrypted=${response.headers.get('X-Nitro-Sec') === '1'} fp=${response.headers.get('X-Nitro-Key-Fp') || 'none'} derive=${response.headers.get('X-Nitro-Derive-Fp') || 'none'} client=${session.fingerprint}`
                );

                if (response.headers.get('X-Nitro-Sec') === '1') {
                    try {
                        const decrypted = await decryptResponse(session, response);
                        setDebugState(`secure: decrypted ${requestUrl}`);
                        return decrypted;
                    } catch (error) {
                        setDebugState(`secure: decrypt failed ${(error as Error)?.message || error}`);
                        throw error;
                    }
                }

                setDebugState(`secure: plain response ${requestUrl} status=${response.status}`);

                return response;
            })();

            if (cacheKey) cacheSecureResponse(cacheKey, responsePromise);

            return cloneCachedResponse(responsePromise);
        }

        if (getClientMode().secureApiEnabled && isApiUrl(requestUrl)) {
            const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
            const session = await getSecureSession();
            const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
            const clearBody = await readRequestBody(input, init, method);
            const secureBody = buildSecureApiEnvelope(requestUrl, method, clearBody);
            const encryptedInit: RequestInit = { ...init, method, headers };

            headers.set('X-Nitro-Key', session.publicKey);
            headers.set('X-Nitro-Api', '1');

            if (secureBody) {
                encryptedInit.body = await encryptBytes(session, secureBody);
                headers.set('Content-Type', 'text/plain; charset=utf-8');
            }

            const response = await nativeFetch(input, encryptedInit);

            if (response.headers.get('X-Nitro-Sec') === '1') {
                const decrypted = await decryptResponse(session, response);

                try {
                    const pathname = new URL(requestUrl, window.location.href).pathname;

                    if (response.ok && REKEY_ENDPOINTS.has(pathname)) {
                        setDebugState(`secure: rekey after ${pathname}`);
                        scheduleSecureRekey();
                    }
                } catch {}

                return decrypted;
            }

            return response;
        }

        return nativeFetch(input, init);
    };
};
