import { GetSessionDataManager } from '@octane/renderer';
import { localizeWithFallback } from '../utils/localizeWithFallback';
import { getCalendarSubscriptionImageUrl, getCurrencyIconUrl, getFurnitureIconUrl } from './CalendarRewardDisplay';

/** The notification types the server sends for each part of an opened calendar day: `calendar.reward.<kind>`. */
export const CALENDAR_REWARD_NOTIFICATION_PREFIX = 'calendar.reward.';

/** English texts for hotels whose texts lack `notification.calendar.reward.<kind>.message`. */
const FALLBACK_MESSAGES: Record<string, string> = {
    credits: 'You received %amount% credits!',
    pixels: 'You received %amount% duckets!',
    points: 'You received %amount% points!',
    club: 'You received %amount% days of %subscription%!',
    furni: 'You received %item%!'
};

export interface CalendarRewardBubble {
    message: string;
    imageUrl: string;
}

const getFurniName = (className: string): string => {
    const sessionData = GetSessionDataManager();

    return sessionData.getFloorItemDataByName(className)?.name || sessionData.getWallItemDataByName(className)?.name || className;
};

/**
 * The text and icon of one `calendar.reward.<kind>` bubble: the amount (and subscription or furni name) filled into the
 * hotel's `notification.calendar.reward.<kind>.message`, with the currency icon, the HC icon or the furni icon.
 * Null for a type that is not a calendar reward.
 */
export const getCalendarRewardBubble = (type: string, options: Map<string, string>): CalendarRewardBubble => {
    if (!type?.startsWith(CALENDAR_REWARD_NOTIFICATION_PREFIX)) return null;

    const kind = type.substring(CALENDAR_REWARD_NOTIFICATION_PREFIX.length);
    const values: Record<string, string> = { amount: options.get('amount') ?? '' };
    let imageUrl: string = null;

    switch (kind) {
        case 'credits':
        case 'pixels':
        case 'points':
            imageUrl = getCurrencyIconUrl(options.get('currency') ?? (kind === 'credits' ? '-1' : '0'));
            break;
        case 'club': {
            const subscription = options.get('subscription') ?? '';

            values.subscription = subscription === 'HABBO_CLUB' ? 'Habbo Club' : subscription === 'BUILDERS_CLUB' ? 'Builders Club' : subscription;
            imageUrl = getCalendarSubscriptionImageUrl(subscription);
            break;
        }
        case 'furni': {
            const className = options.get('furni') ?? '';

            values.item = getFurniName(className);
            imageUrl = getFurnitureIconUrl(className);
            break;
        }
    }

    const names = Object.keys(values);
    const fallback = names.reduce((text, name) => text.replaceAll(`%${name}%`, values[name]), FALLBACK_MESSAGES[kind] ?? '%amount%');

    return {
        message: localizeWithFallback(`notification.${type}.message`, fallback, names, Object.values(values)),
        imageUrl
    };
};
