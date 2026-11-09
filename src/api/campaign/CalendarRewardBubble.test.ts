import { GetRoomEngine, GetSessionDataManager } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

const texts = new Map<string, string>();

vi.mock('../octane', () => ({
    GetConfigurationValue: (key: string) => (key === 'currency.asset.icon.url' ? '/wallet/%type%.png' : key === 'image.library.url' ? 'https://images/' : '')
}));
vi.mock('../utils/LocalizeText', () => ({
    LocalizeText: (key: string, names: string[] = [], values: string[] = []) => {
        let text = texts.get(key) ?? key;

        names?.forEach((name, index) => (text = text.replaceAll(`%${name}%`, values[index])));

        return text;
    }
}));

import { getCalendarRewardBubble } from './CalendarRewardBubble';

const options = (entries: Record<string, string>) => new Map(Object.entries(entries));

afterEach(() => {
    texts.clear();
    vi.mocked(GetSessionDataManager).mockReset();
});

describe('calendar reward bubbles (calendar.reward.<kind>)', () => {
    it('words credits, duckets and points with the amount and shows the currency icon', () => {
        expect(getCalendarRewardBubble('calendar.reward.credits', options({ amount: '50', currency: '-1' }))).toEqual({
            message: 'You received 50 credits!',
            imageUrl: '/wallet/-1.png'
        });
        expect(getCalendarRewardBubble('calendar.reward.pixels', options({ amount: '200', currency: '0' }))?.imageUrl).toBe('/wallet/0.png');
        expect(getCalendarRewardBubble('calendar.reward.points', options({ amount: '5', currency: '5' }))).toEqual({
            message: 'You received 5 points!',
            imageUrl: '/wallet/5.png'
        });
    });

    it("uses the hotel's text when it has one", () => {
        texts.set('notification.calendar.reward.credits.message', 'Je hebt %amount% credits ontvangen!');

        expect(getCalendarRewardBubble('calendar.reward.credits', options({ amount: '50' }))?.message).toBe('Je hebt 50 credits ontvangen!');
    });

    it('names Habbo Club and the furni by its furnidata name, with their icons', () => {
        expect(getCalendarRewardBubble('calendar.reward.club', options({ amount: '7', subscription: 'HABBO_CLUB' }))).toEqual({
            message: 'You received 7 days of Habbo Club!',
            imageUrl: expect.stringContaining('advent_extras_hc')
        });
        expect(getCalendarRewardBubble('calendar.reward.club', options({ amount: '3', subscription: 'BUILDERS_CLUB' }))).toEqual({
            message: 'You received 3 days of Builders Club!',
            imageUrl: expect.stringContaining('advent_extras_bc')
        });

        vi.mocked(GetSessionDataManager).mockReturnValue({
            getFloorItemDataByName: (name: string) => (name === 'throne' ? { id: 3, name: 'Troon' } : null),
            getWallItemDataByName: () => null
        } as never);
        vi.mocked(GetRoomEngine).mockReturnValue({ getFurnitureFloorIconUrl: (id: number) => `icon-${id}` } as never);

        expect(getCalendarRewardBubble('calendar.reward.furni', options({ amount: '1', furni: 'throne' }))).toEqual({
            message: 'You received Troon!',
            imageUrl: 'icon-3'
        });
    });

    it('leaves other notifications alone', () => {
        expect(getCalendarRewardBubble('receivedbadge', options({}))).toBeNull();
        expect(getCalendarRewardBubble(null, options({}))).toBeNull();
    });
});
