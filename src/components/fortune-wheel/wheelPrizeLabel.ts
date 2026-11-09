import { GetSessionDataManager, IWheelPrize } from '@octane/renderer';
import { localizeWithFallback } from '../../api';

export type WheelPrizeLike = Pick<IWheelPrize, 'type' | 'amount' | 'pointsType' | 'label'> & Partial<Pick<IWheelPrize, 'spriteId'>>;

/** Activity point types with their own text; any other type borrows the purse name of the currency. */
const POINTS_KEYS: Record<number, { key: string; fallback: string }> = {
    0: { key: 'wheel.prize.duckets', fallback: '%amount% duckets' },
    5: { key: 'wheel.prize.diamonds', fallback: '%amount% diamonds' }
};

const furniName = (spriteId: number): string => {
    if (!spriteId) return '';

    try {
        return GetSessionDataManager()?.getFloorItemData(spriteId)?.name ?? '';
    } catch {
        return '';
    }
};

/**
 * The text of a prize in the hotel's language. Currencies, extra spins and the empty slice are built from
 * the prize itself, so a label typed in English ("200 diamonds") no longer leaks into a translated hotel.
 * Furni and badges keep the label set by the staff; a furni without one is named after its furni data.
 */
export const getWheelPrizeLabel = (prize: WheelPrizeLike): string => {
    if (!prize) return '';

    const amount = String(prize.amount ?? 0);

    switch (prize.type) {
        case 'credits':
            return localizeWithFallback('wheel.prize.credits', '%amount% credits', ['amount'], [amount]);
        case 'points': {
            const known = POINTS_KEYS[prize.pointsType];

            if (known) return localizeWithFallback(known.key, known.fallback, ['amount'], [amount]);

            const currency = localizeWithFallback(`purse.seasonal.currency.${prize.pointsType}`, localizeWithFallback('wheel.prize.points.name', 'points'));

            return localizeWithFallback('wheel.prize.points', '%amount% %currency%', ['amount', 'currency'], [amount, currency]);
        }
        case 'spin':
            return prize.amount === 1
                ? localizeWithFallback('wheel.prize.spin', '1 extra spin')
                : localizeWithFallback('wheel.prize.spins', '%amount% extra spins', ['amount'], [amount]);
        case 'nothing':
            return localizeWithFallback('wheel.prize.nothing', 'No luck this time');
        case 'item':
            return prize.label || furniName(prize.spriteId);
        default:
            return prize.label || '';
    }
};

/** The prize of the wheel a recent win was stored with: the win only carries the label of that moment. */
const findPrizeByLabel = <T extends WheelPrizeLike>(label: string, prizes: T[]): T | null =>
    (label && prizes?.find((entry) => !!entry?.label && entry.label === label)) || null;

/** A recent win in the hotel's language when its label still matches a prize; an older label stays as stored. */
export const getWinLabel = (label: string, prizes: WheelPrizeLike[]): string => {
    const prize = findPrizeByLabel(label, prizes);

    return prize ? getWheelPrizeLabel(prize) : label;
};

/** The currency icon type of a recent win (-1 for credits), or null when it is not a currency. */
export const getWinCurrencyType = (label: string, prizes: WheelPrizeLike[]): number | null => {
    const prize = findPrizeByLabel(label, prizes);

    if (prize?.type === 'credits') return -1;

    if (prize?.type === 'points') return prize.pointsType;

    return null;
};
