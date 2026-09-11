import { describe, expect, it, vi } from 'vitest';

const config: Record<string, string> = {};
const openUrl = vi.fn();

vi.mock('../../../api', () => ({
    GetConfigurationValue: (key: string, fallback: string) => config[key] ?? fallback,
    OpenUrl: (url: string) => openUrl(url)
}));

import { buildHousekeepingUrl, openHousekeepingPage } from './ModToolsHousekeepingLinks';

describe('housekeeping links', () => {
    it('appends the parameter to the configured prefix like the official client', () => {
        expect(buildHousekeepingUrl('https://hk.example/modlog?user=', 'sulka')).toBe('https://hk.example/modlog?user=sulka');
    });

    it('fills a %param% marker when the hotel put the value in the middle of its url', () => {
        expect(buildHousekeepingUrl('https://hk.example/users/%param%/identity', 42)).toBe('https://hk.example/users/42/identity');
    });

    it('opens nothing when the hotel has not configured the page', () => {
        openUrl.mockClear();

        expect(openHousekeepingPage('moderatoractionlog.url', 'sulka')).toBe(false);
        expect(openUrl).not.toHaveBeenCalled();
    });

    it('opens the completed url when the page is configured', () => {
        openUrl.mockClear();
        config['roomadmin.url'] = 'https://hk.example/rooms/';

        expect(openHousekeepingPage('roomadmin.url', 7)).toBe(true);
        expect(openUrl).toHaveBeenCalledWith('https://hk.example/rooms/7');
    });
});
