import { GetConfiguration, GetSessionDataManager } from '@octane/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBadgeLeaderboard, getCachedBadgeLeaderboard, resetBadgeLeaderboardCache } from './BadgeLeaderboardApi';

const reply = (viewerUserId: number) => new Response(JSON.stringify({ viewerUserId, badgeStats: [] }), { status: 200 });

describe('badge leaderboard cache', () => {
    let viewer = 1;
    const nativeFetch = globalThis.fetch;

    beforeEach(() => {
        viewer = 1;
        resetBadgeLeaderboardCache();
        vi.mocked(GetSessionDataManager).mockImplementation(() => ({ userId: viewer }) as any);
        vi.mocked(GetConfiguration).mockImplementation(() => ({ getValue: (_key: string, fallback: string) => fallback, interpolate: (value: string) => value }) as any);
    });

    afterEach(() => {
        globalThis.fetch = nativeFetch;
    });

    it('loads again for another account instead of showing the first one its data', async () => {
        globalThis.fetch = vi.fn(async () => reply(viewer)) as typeof fetch;

        expect((await fetchBadgeLeaderboard()).viewerUserId).toBe(1);
        expect((await fetchBadgeLeaderboard()).viewerUserId).toBe(1);
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);

        viewer = 2;
        expect((await fetchBadgeLeaderboard()).viewerUserId).toBe(2);
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('does not keep a reply that arrives after the account changed', async () => {
        let release: (value: Response) => void = () => {};
        globalThis.fetch = vi.fn(() => new Promise<Response>((resolve) => (release = resolve))) as typeof fetch;

        const first = fetchBadgeLeaderboard();
        resetBadgeLeaderboardCache();
        release(reply(1));
        await first;

        expect(getCachedBadgeLeaderboard()).toBeNull();
    });
});
