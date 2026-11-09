import { GetRoomEngine, GetSessionDataManager } from '@octane/renderer';
import adventBc from '../../assets/images/campaign/advent_extras_bc.png';
import adventCoins from '../../assets/images/campaign/advent_extras_coins.png';
import adventDucket from '../../assets/images/campaign/advent_extras_ducket.png';
import adventHc from '../../assets/images/campaign/advent_extras_hc.png';
import { GetConfigurationValue } from '../octane';
import { ICalendarItem } from './ICalendarItem';

/** The inventory icon of a floor or wall furni by classname, or null when furnidata does not know it. */
export const getFurnitureIconUrl = (className: string): string => {
    if (!className) return null;

    const floorData = GetSessionDataManager().getFloorItemDataByName(className);

    if (floorData) return GetRoomEngine().getFurnitureFloorIconUrl(floorData.id);

    const wallData = GetSessionDataManager().getWallItemDataByName(className);

    return wallData ? GetRoomEngine().getFurnitureWallIconUrl(wallData.id) : null;
};

/**
 * The name of a received calendar reward: the product's localized name when the product name is a known product
 * code (a furni classname, for example), otherwise the text the hotel gave the reward.
 */
export const getCalendarRewardName = (reward: ICalendarItem): string => {
    if (!reward) return '';

    return GetSessionDataManager().getProductData(reward.productName)?.name || reward.productName || '';
};

/** The purse icon of a currency type (-1 credits, 0 duckets, others the seasonal points), from `currency.asset.icon.url`. */
export const getCurrencyIconUrl = (currency: string | number): string => {
    const url = GetConfigurationValue<string>('currency.asset.icon.url', '');

    return url ? url.replace('%type%', String(currency)) : null;
};

/** Habbo's advent pictures (`advent_extras_*`), built into the client. */
export const CALENDAR_ADVENT_IMAGES = { hc: adventHc, bc: adventBc, coins: adventCoins, ducket: adventDucket } as const;

/** The advent picture of a subscription reward: Habbo Club or Builders Club. Null for any other subscription. */
export const getCalendarSubscriptionImageUrl = (subscriptionType: string): string =>
    subscriptionType === 'HABBO_CLUB' ? CALENDAR_ADVENT_IMAGES.hc : subscriptionType === 'BUILDERS_CLUB' ? CALENDAR_ADVENT_IMAGES.bc : null;

/**
 * The picture of a received calendar reward, shown in the opened box: its custom image from the image library, else
 * the furni, the badge, or Habbo's advent picture of the HC / BC, credits or duckets it holds (the currency icon for
 * points), in that order. Null when nothing is known.
 */
export const getCalendarRewardImageUrl = (reward: ICalendarItem): string => {
    if (!reward) return null;
    if (reward.customImage) return GetConfigurationValue<string>('image.library.url') + reward.customImage;

    const furniIcon = getFurnitureIconUrl(reward.furnitureClassName) ?? getFurnitureIconUrl(reward.productName);

    if (furniIcon) return furniIcon;
    if (reward.badgeCode) return GetSessionDataManager().getBadgeUrl(reward.badgeCode);
    if (reward.subscriptionDays > 0) {
        const subscriptionImage = getCalendarSubscriptionImageUrl(reward.subscriptionType);

        if (subscriptionImage) return subscriptionImage;
    }
    if (reward.credits > 0) return CALENDAR_ADVENT_IMAGES.coins;
    if (reward.pixels > 0) return CALENDAR_ADVENT_IMAGES.ducket;
    if (reward.points > 0) return getCurrencyIconUrl(reward.pointsType ?? 0);

    return null;
};
