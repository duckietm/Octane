import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => ({ enabled: false }));

vi.mock('../../api', () => ({ GetConfigurationValue: (key: string, fallback: unknown) => (key === 'show.google.ads' ? settings.enabled : fallback) }));
vi.mock('../../common', () => ({ OctaneCardContentView: () => null, OctaneCardHeaderView: () => null, OctaneCardView: () => null }));
vi.mock('../../secure-assets', () => ({ configFileUrl: (name: string) => `/configuration/${name}` }));

const { GoogleAdsView } = await import('./GoogleAdsView');

describe('GoogleAdsView', () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: false, status: 404 } as Response));

    beforeEach(() => {
        fetchSpy.mockClear();
        vi.stubGlobal('fetch', fetchSpy);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('requests nothing while ads are turned off', () => {
        settings.enabled = false;

        render(<GoogleAdsView />);

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('loads ads.txt and the sense config when ads are turned on', () => {
        settings.enabled = true;

        render(<GoogleAdsView />);

        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});
