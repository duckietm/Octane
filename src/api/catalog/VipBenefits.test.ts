import { CreateLinkEvent } from '@octane/renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ values: {} as Record<string, unknown> }));

vi.mock('../octane/GetConfigurationValue', () => ({
    GetConfigurationValue: (key: string, fallback: unknown = null) => (key in config.values ? config.values[key] : fallback)
}));

vi.mock('../octane/OpenUrl', () => ({ OpenUrl: vi.fn() }));

import { OpenUrl } from '../octane/OpenUrl';
import { flashFontTagsToSpans, ShowVipBenefits, VIP_BENEFITS_LINK } from './VipBenefits';

describe('ShowVipBenefits', () => {
    beforeEach(() => {
        config.values = {};
        vi.mocked(CreateLinkEvent).mockClear();
        vi.mocked(OpenUrl).mockClear();
    });

    it('opens the window unless the hotel turns it off', () => {
        ShowVipBenefits();

        expect(CreateLinkEvent).toHaveBeenCalledWith(VIP_BENEFITS_LINK);
        expect(OpenUrl).not.toHaveBeenCalled();
    });

    it('falls back to the club page like AIR when the window is off', () => {
        config.values = { 'catalog.vip.benefits.enabled': false, 'link.format.club': 'https://hotel/club' };

        ShowVipBenefits();

        expect(CreateLinkEvent).not.toHaveBeenCalled();
        expect(OpenUrl).toHaveBeenCalledWith('https://hotel/club');
    });
});

describe('flashFontTagsToSpans', () => {
    it('turns Flash font sizes into pixel spans', () => {
        expect(flashFontTagsToSpans('<b><font size="24">Maak</font></b><br/>je')).toBe('<b><span style="font-size: 24px">Maak</span></b><br/>je');
        expect(flashFontTagsToSpans("<font color='#fff'>x</FONT>")).toBe('<span>x</span>');
        expect(flashFontTagsToSpans(null)).toBe('');
    });
});
