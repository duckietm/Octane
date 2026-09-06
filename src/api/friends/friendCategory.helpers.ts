import { FriendCategoryData } from '@octane/renderer';
import { MessengerFriend } from './MessengerFriend';
import { MessengerSettings } from './MessengerSettings';

/**
 * Filter a friend list to a single category. categoryId 0 means
 * "All" (no filtering) and returns the list unchanged.
 */
export const filterFriendsByCategory = (friends: MessengerFriend[], categoryId: number): MessengerFriend[] => {
    if (!friends) return [];

    if (!categoryId) return friends;

    return friends.filter((friend) => friend.categoryId === categoryId);
};

/**
 * Count how many friends belong to each category id. Used to render
 * member counts on the group chips.
 */
export const countFriendsByCategory = (friends: MessengerFriend[]): Map<number, number> => {
    const counts = new Map<number, number>();

    if (!friends) return counts;

    for (const friend of friends) {
        counts.set(friend.categoryId, (counts.get(friend.categoryId) ?? 0) + 1);
    }

    return counts;
};

export const withUpdatedFriendCategories = (settings: MessengerSettings, categories: FriendCategoryData[]): MessengerSettings => {
    if (!settings) return settings;

    return new MessengerSettings(settings.userFriendLimit, settings.normalFriendLimit, settings.extendedFriendLimit, [ ...(categories ?? []) ]);
};
