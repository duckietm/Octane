export interface AdsFrame {
    src: string;
    sandbox: string;
}

export interface AdsFrameSlot {
    publisherId: string;
    slot: string;
    format?: string;
    fullWidthResponsive?: boolean;
}

const SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox';

/**
 * The frame an ad is shown in when the hotel serves its ad page from another origin (`ads.frame.url`). The ad
 * script then runs there, away from the client's session; the frame may open the advertiser in a new tab but never
 * navigate the client. A page on the client's own origin would share its storage, so it gets no same-origin rights.
 * Returns null when the URL is not a plain web URL.
 */
export const resolveAdsFrame = (frameUrl: string, slot: AdsFrameSlot, clientOrigin: string): AdsFrame | null => {
    if (!frameUrl || typeof frameUrl !== 'string') return null;

    let target: URL;
    try {
        target = new URL(frameUrl.trim(), clientOrigin);
    } catch {
        return null;
    }

    if (target.protocol !== 'https:' && target.protocol !== 'http:') return null;

    target.searchParams.set('client', `ca-${slot.publisherId}`);
    target.searchParams.set('slot', slot.slot);
    target.searchParams.set('format', slot.format ?? 'auto');
    target.searchParams.set('responsive', (slot.fullWidthResponsive ?? true) ? 'true' : 'false');

    const sameOrigin = target.origin === clientOrigin;

    return { src: target.href, sandbox: sameOrigin ? SANDBOX : `${SANDBOX} allow-same-origin` };
};
