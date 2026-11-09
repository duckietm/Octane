import { isSafeExternalUrl } from './isSafeExternalUrl';

export interface GameFrame {
    src: string;
    sandbox: string;
}

const SANDBOX = 'allow-scripts allow-forms allow-pointer-lock allow-popups';

/**
 * Checks a game URL the server sent before it becomes an iframe. Only http(s) is accepted - a `javascript:` URL
 * would run in the client's own origin, next to its tokens - and, when the hotel lists its game hosts, only those
 * hosts. The frame is sandboxed; a game on another origin keeps its own storage, a game on the client's origin does
 * not get the client's.
 */
export const resolveGameFrame = (url: string, allowedHosts: readonly string[], clientOrigin: string): GameFrame | null => {
    if (!isSafeExternalUrl(url)) return null;

    const target = new URL(url.trim());
    const hosts = allowedHosts.map((host) => host.trim().toLowerCase()).filter(Boolean);

    if (hosts.length && !hosts.includes(target.hostname.toLowerCase())) return null;

    const sameOrigin = target.origin === clientOrigin;

    return { src: target.href, sandbox: sameOrigin ? SANDBOX : `${SANDBOX} allow-same-origin` };
};
