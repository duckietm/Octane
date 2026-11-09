import { MessengerFriend } from '../../../../../api';
import { isStaffChatIdentity } from '../../../staffChatIdentity';

/** AIR refreshFriendEntry: follow shows when the friend allows following (only sent for an online friend). */
export const canFollowFriendListEntry = (friend: Pick<MessengerFriend, 'id' | 'name' | 'online' | 'followingAllowed'>) =>
    friend.online && friend.followingAllowed && friend.id > 0 && !isStaffChatIdentity(friend);

/** AIR refreshFriendEntry: chat shows for an online friend, or an offline one who can get stored messages. */
export const canChatWithFriendListEntry = (
    friend: Pick<MessengerFriend, 'online' | 'persistedMessageUser' | 'pocketHabboUser'>,
    messagesPersisted: boolean
) => friend.online || (messagesPersisted && (friend.persistedMessageUser || friend.pocketHabboUser));
