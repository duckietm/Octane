import { generateKeyPairSync, randomBytes } from 'node:crypto';

export const SECURE_MODES = [ 'on', 'off' ];

const ASSETS_KEY = 'nitro.secure.assets.enabled';
const API_KEY = 'nitro.secure.api.enabled';
const MASTER_KEY = 'nitro.secure.master_key';
const INI_HEADER = '# Nitro secure runtime (added by the Octane installer)';

export const normalizeSecureAnswer = raw =>
{
    const value = (raw || '').trim().toLowerCase();

    if(!value || value === 'y' || value === 'yes' || value === 'on' || value === '1') return 'on';
    if(value === 'n' || value === 'no' || value === 'off' || value === '0') return 'off';

    return null;
};

// A path pasted or dragged into a terminal usually arrives wrapped in quotes.
export const cleanPathAnswer = raw => (raw || '').trim().replace(/^(["'])(.*)\1$/, '$2').trim();

// The shipped examples point at example.com; a probe there would be a real
// request to a host that is not the user's.
export const isPlaceholderHost = url =>
{
    try
    {
        const host = new URL(url).hostname.toLowerCase();

        return [ 'example.com', 'example.org', 'example.net' ].some(name => host === name || host.endsWith('.' + name));
    }
    catch
    {
        return true;
    }
};

export const generateMasterKey = () => randomBytes(32).toString('hex');

// The example config ships "change-me-..." and an empty value means an ephemeral
// server key: neither is a secret worth keeping.
export const isPlaceholderSecret = value =>
{
    const trimmed = (value || '').trim();

    return !trimmed || /^change[-_ ]/i.test(trimmed);
};

export const readIniValue = (text, key) =>
{
    let found = null;

    for(const line of text.split(/\r?\n/))
    {
        const match = /^\s*([A-Za-z0-9_.]+)\s*=(.*)$/.exec(line);

        if(match && match[1] === key) found = match[2].trim();
    }

    return found;
};

export const patchClientMode = (clientMode, { assets, api }) =>
{
    const next = { ...clientMode, secureAssetsEnabled: assets, secureApiEnabled: api };
    const changed = next.secureAssetsEnabled !== clientMode.secureAssetsEnabled || next.secureApiEnabled !== clientMode.secureApiEnabled;

    return { clientMode: next, changed };
};

// Rewrites every line that sets one of the keys and appends the ones that are
// missing, so comments, ordering and the file's line endings stay as they were.
export const patchIniValues = (text, values) =>
{
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const seen = new Set();
    const changes = [];

    const lines = text.split(/\r?\n/).map(line =>
    {
        const match = /^(\s*)([A-Za-z0-9_.]+)\s*=(.*)$/.exec(line);

        if(!match || !Object.prototype.hasOwnProperty.call(values, match[2])) return line;

        seen.add(match[2]);

        if(match[3].trim() === values[match[2]]) return line;

        changes.push(match[2]);

        return `${ match[1] }${ match[2] }=${ values[match[2]] }`;
    });

    const missing = Object.keys(values).filter(key => !seen.has(key));

    if(missing.length)
    {
        const endsWithEol = lines.length > 0 && lines[lines.length - 1] === '';

        if(endsWithEol) lines.pop();

        lines.push('', INI_HEADER, ...missing.map(key => `${ key }=${ values[key] }`), '');
        changes.push(...missing);
    }

    return { text: lines.join(eol), changes };
};

// Decides what the emulator config should hold. A master key somebody already
// chose is kept: replacing it would invalidate every client holding the old one.
export const resolveIniValues = (existingText, { assets, api }) =>
{
    const current = existingText === null ? null : readIniValue(existingText, MASTER_KEY);
    const keepKey = current !== null && !isPlaceholderSecret(current);
    const values = { [ASSETS_KEY]: String(assets), [API_KEY]: String(api) };

    if(assets || api)
    {
        if(!keepKey) values[MASTER_KEY] = generateMasterKey();
    }

    return { values, keptMasterKey: keepKey && (assets || api) };
};

export const buildIniSnippet = values =>
    [ INI_HEADER, ...Object.entries(values).map(([ key, value ]) => `${ key }=${ value }`) ].join('\n');

// A real P-256 key, because the server answers the bootstrap with the same
// import a browser's key goes through.
export const probeBootstrap = async (apiBaseUrl, fetchImpl = fetch) =>
{
    const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const key = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
    const url = `${ apiBaseUrl.replace(/\/+$/, '') }/nitro-sec/bootstrap`;

    try
    {
        const response = await fetchImpl(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key }),
            signal: AbortSignal.timeout(5000)
        });

        if(!response.ok) return { state: 'rejected', detail: `HTTP ${ response.status }` };

        const payload = await response.json();

        if(!payload || typeof payload.key !== 'string' || !payload.key.length) return { state: 'rejected', detail: 'no server key in the answer' };

        return { state: 'ready', fingerprint: response.headers.get('X-Nitro-Key-Fp') || '' };
    }
    catch(error)
    {
        return { state: 'unreachable', detail: error?.message || String(error) };
    }
};
