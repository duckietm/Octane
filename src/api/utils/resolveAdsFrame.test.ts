import { describe, expect, it } from 'vitest';
import { resolveAdsFrame } from './resolveAdsFrame';

const CLIENT = 'https://hotel.example';
const SLOT = { publisherId: 'pub-123', slot: '456' };

describe('resolveAdsFrame', () => {
    it('passes the ad unit to the ad page in the query', () => {
        const frame = resolveAdsFrame('https://ads.example.net/ads-frame.html', { ...SLOT, format: 'rectangle', fullWidthResponsive: false }, CLIENT);
        const src = new URL(frame!.src);

        expect(src.origin).toBe('https://ads.example.net');
        expect(src.searchParams.get('client')).toBe('ca-pub-123');
        expect(src.searchParams.get('slot')).toBe('456');
        expect(src.searchParams.get('format')).toBe('rectangle');
        expect(src.searchParams.get('responsive')).toBe('false');
    });

    it('lets the ad open the advertiser but never navigate the client', () => {
        const sandbox = resolveAdsFrame('https://ads.example.net/ads-frame.html', SLOT, CLIENT)!.sandbox;

        expect(sandbox).toContain('allow-scripts');
        expect(sandbox).toContain('allow-popups-to-escape-sandbox');
        expect(sandbox).not.toContain('allow-top-navigation');
    });

    it('gives an ad page on the client origin no access to the client storage', () => {
        expect(resolveAdsFrame('/ads-frame.html', SLOT, CLIENT)!.sandbox).not.toContain('allow-same-origin');
        expect(resolveAdsFrame('https://ads.example.net/ads-frame.html', SLOT, CLIENT)!.sandbox).toContain('allow-same-origin');
    });

    it('refuses what is not a web URL', () => {
        expect(resolveAdsFrame('javascript:alert(1)', SLOT, CLIENT)).toBeNull();
        expect(resolveAdsFrame('', SLOT, CLIENT)).toBeNull();
    });
});
