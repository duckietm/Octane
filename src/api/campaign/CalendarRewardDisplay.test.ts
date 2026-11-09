import { GetRoomEngine, GetSessionDataManager } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../octane', () => ({ GetConfigurationValue: (key: string) => (key === 'currency.asset.icon.url' ? '/wallet/%type%.png' : 'https://images/') }));

import { CalendarItem } from './CalendarItem';
import { getCalendarRewardImageUrl, getCalendarRewardName } from './CalendarRewardDisplay';

const sessionData = (products: Record<string, string>, floor: Record<string, number> = {}) =>
    vi.mocked(GetSessionDataManager).mockReturnValue({
        getProductData: (code: string) => (products[code] ? { name: products[code] } : null),
        getFloorItemDataByName: (name: string) => (floor[name] ? { id: floor[name] } : null),
        getWallItemDataByName: () => null,
        getBadgeUrl: (code: string) => `badge-${code}`
    } as never);

afterEach(() => vi.mocked(GetSessionDataManager).mockReset());

describe('calendar reward name and picture', () => {
    it('names a known product by its localized name, anything else by the text the hotel gave it', () => {
        sessionData({ throne: 'Troon' });

        expect(getCalendarRewardName(new CalendarItem('throne', '', 'throne'))).toBe('Troon');
        expect(getCalendarRewardName(new CalendarItem('50 credits', '', ''))).toBe('50 credits');
        expect(getCalendarRewardName(null)).toBe('');
    });

    it('shows the custom image from the image library, else the furni icon', () => {
        sessionData({}, { throne: 7 });
        vi.mocked(GetRoomEngine).mockReturnValue({ getFurnitureFloorIconUrl: (id: number) => `icon-${id}` } as never);

        expect(getCalendarRewardImageUrl(new CalendarItem('50 credits', 'calendar/credits.png', ''))).toBe('https://images/calendar/credits.png');
        expect(getCalendarRewardImageUrl(new CalendarItem('Troon', '', 'throne'))).toBe('icon-7');
        expect(getCalendarRewardImageUrl(new CalendarItem('50 credits', '', ''))).toBeNull();
    });

    it('shows the badge, the HC icon or the currency icon of a reward without furni or custom image', () => {
        sessionData({});

        expect(getCalendarRewardImageUrl(new CalendarItem('Badge', '', '', { badgeCode: 'ACH_Login1', credits: 50 }))).toBe('badge-ACH_Login1');
        expect(getCalendarRewardImageUrl(new CalendarItem('HC', '', '', { subscriptionType: 'HABBO_CLUB', subscriptionDays: 7 }))).toContain(
            'advent_extras_hc'
        );
        expect(getCalendarRewardImageUrl(new CalendarItem('BC', '', '', { subscriptionType: 'BUILDERS_CLUB', subscriptionDays: 3 }))).toContain(
            'advent_extras_bc'
        );
        expect(getCalendarRewardImageUrl(new CalendarItem('50 credits', '', '', { credits: 50 }))).toContain('advent_extras_coins');
        expect(getCalendarRewardImageUrl(new CalendarItem('Duckets', '', '', { pixels: 100 }))).toContain('advent_extras_ducket');
        expect(getCalendarRewardImageUrl(new CalendarItem('Diamonds', '', '', { points: 5, pointsType: 5 }))).toBe('/wallet/5.png');
    });
});
