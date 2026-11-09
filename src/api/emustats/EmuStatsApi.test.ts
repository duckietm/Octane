import { afterEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ token: 'staff-token' as string | null }));

vi.mock('../auth', () => ({ getAccessToken: () => session.token }));
vi.mock('@octane/renderer', () => ({
    GetConfiguration: () => ({ getValue: (_key: string, fallback: unknown) => fallback, interpolate: (value: string) => value })
}));

import { fetchEmuStats, getCachedEmuStats } from './EmuStatsApi';

describe('EmuStats cache', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('keeps a snapshot for the session that fetched it only', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ onlineUsers: 7 }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        session.token = 'staff-token';
        await fetchEmuStats();
        expect(getCachedEmuStats()).toEqual({ onlineUsers: 7 });

        session.token = 'player-token';
        expect(getCachedEmuStats()).toBeNull();

        await fetchEmuStats();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
