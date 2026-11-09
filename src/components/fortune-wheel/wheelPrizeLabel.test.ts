import { describe, expect, it, vi } from 'vitest';

const TEXTS: Record<string, string> = {
    'wheel.prize.credits': '%amount% crédits',
    'wheel.prize.diamonds': '%amount% diamants',
    'wheel.prize.duckets': '%amount% duckets',
    'wheel.prize.points': '%amount% %currency%',
    'wheel.prize.spin': '1 tour bonus',
    'wheel.prize.spins': '%amount% tours bonus',
    'wheel.prize.nothing': 'Pas de chance cette fois',
    'purse.seasonal.currency.105': 'flocons'
};

const fill = (text: string, parameters: string[] = null, replacements: string[] = null) =>
    (parameters ?? []).reduce((value, parameter, index) => value.split(`%${parameter}%`).join(replacements[index]), text);

vi.mock('../../api', () => ({
    localizeWithFallback: (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null) =>
        fill(TEXTS[key] ?? fallback, parameters, replacements)
}));
vi.mock('@octane/renderer', () => ({
    GetSessionDataManager: () => ({ getFloorItemData: (id: number) => (id === 230 ? { name: 'Trône' } : null) })
}));

const { getWheelPrizeLabel, getWinCurrencyType, getWinLabel } = await import('./wheelPrizeLabel');

describe('getWheelPrizeLabel', () => {
    it('names currencies, spins and the empty slice in the hotel language, whatever label the staff typed', () => {
        expect(getWheelPrizeLabel({ type: 'points', amount: 200, pointsType: 5, label: '200 diamonds' })).toBe('200 diamants');
        expect(getWheelPrizeLabel({ type: 'points', amount: 15, pointsType: 0, label: '15 duckets' })).toBe('15 duckets');
        expect(getWheelPrizeLabel({ type: 'credits', amount: 100, pointsType: 0, label: '100 credits' })).toBe('100 crédits');
        expect(getWheelPrizeLabel({ type: 'spin', amount: 1, pointsType: 0, label: '1 Extra spin' })).toBe('1 tour bonus');
        expect(getWheelPrizeLabel({ type: 'spin', amount: 2, pointsType: 0, label: '2 Extra spins' })).toBe('2 tours bonus');
        expect(getWheelPrizeLabel({ type: 'nothing', amount: 0, pointsType: 0, label: 'Oh to bad!' })).toBe('Pas de chance cette fois');
    });

    it('borrows the purse name of any other activity point', () => {
        expect(getWheelPrizeLabel({ type: 'points', amount: 3, pointsType: 105, label: '' })).toBe('3 flocons');
        expect(getWheelPrizeLabel({ type: 'points', amount: 3, pointsType: 999, label: '' })).toBe('3 points');
    });

    it('keeps the staff label of furni and badges, and names an unlabelled furni after its furni data', () => {
        expect(getWheelPrizeLabel({ type: 'item', amount: 1, pointsType: 0, label: 'Trône doré', spriteId: 230 })).toBe('Trône doré');
        expect(getWheelPrizeLabel({ type: 'item', amount: 1, pointsType: 0, label: '', spriteId: 230 })).toBe('Trône');
        expect(getWheelPrizeLabel({ type: 'badge', amount: 1, pointsType: 0, label: 'Badge VIP' })).toBe('Badge VIP');
        expect(getWheelPrizeLabel(null)).toBe('');
    });
});

describe('recent wins', () => {
    const prizes = [
        { type: 'points', amount: 200, pointsType: 5, label: '200 diamonds' },
        { type: 'credits', amount: 100, pointsType: 0, label: '100 credits' },
        { type: 'spin', amount: 1, pointsType: 0, label: '1 Extra spin' }
    ];

    it('translates a win whose stored label still matches a prize, and shows an older one as stored', () => {
        expect(getWinLabel('200 diamonds', prizes)).toBe('200 diamants');
        expect(getWinLabel('Ancien lot', prizes)).toBe('Ancien lot');
    });

    it('gives the currency icon of a won currency only', () => {
        expect(getWinCurrencyType('200 diamonds', prizes)).toBe(5);
        expect(getWinCurrencyType('100 credits', prizes)).toBe(-1);
        expect(getWinCurrencyType('1 Extra spin', prizes)).toBeNull();
        expect(getWinCurrencyType('Ancien lot', prizes)).toBeNull();
    });
});
