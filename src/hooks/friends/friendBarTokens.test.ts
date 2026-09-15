import { describe, expect, it } from 'vitest';
import { applyFriendNotification, dropViewedFriendNotifications, FriendNotificationType, resolveFriendBarTokens } from './friendBarTokens';

describe('applyFriendNotification', () => {
    it('keeps one notification per type, the newest message winning', () => {
        let list = applyFriendNotification([], FriendNotificationType.ACHIEVEMENT, 'first');

        list = applyFriendNotification(list, FriendNotificationType.ACHIEVEMENT, 'second');

        expect(list).toEqual([{ typeCode: FriendNotificationType.ACHIEVEMENT, message: 'second', viewOnce: true }]);
    });

    it('marks only "playing a game" as persistent and clears it on game finished', () => {
        let list = applyFriendNotification([], FriendNotificationType.GAME, 'SnowStorm');

        expect(list[0].viewOnce).toBe(false);

        list = applyFriendNotification(list, FriendNotificationType.QUEST, '');
        list = applyFriendNotification(list, FriendNotificationType.GAME_FINISHED, '');

        expect(list.map((entry) => entry.typeCode)).toEqual([FriendNotificationType.QUEST]);
    });

    it('ignores unknown type codes', () => {
        expect(applyFriendNotification([], 42, 'x')).toEqual([]);
    });

    it('drops the view-once notifications once the tab was viewed', () => {
        const list = [
            { typeCode: FriendNotificationType.GAME, message: '', viewOnce: false },
            { typeCode: FriendNotificationType.ROOM_EVENT, message: '', viewOnce: true }
        ];

        expect(dropViewedFriendNotifications(list).map((entry) => entry.typeCode)).toEqual([FriendNotificationType.GAME]);
    });
});

describe('resolveFriendBarTokens', () => {
    it('raises the messenger token from the unread thread count', () => {
        const tokens = resolveFriendBarTokens([], 2);

        expect(tokens).toHaveLength(1);
        expect(tokens[0]).toMatchObject({ typeCode: FriendNotificationType.INSTANT_MESSAGE, tag: 'message', titleKey: 'friendbar.notify.messenger' });
    });

    it('lists packet notifications newest first with their tag and title key', () => {
        const notifications = [
            { typeCode: FriendNotificationType.ROOM_EVENT, message: 'Party', viewOnce: true },
            { typeCode: FriendNotificationType.GAME, message: 'SnowStorm', viewOnce: false }
        ];

        expect(resolveFriendBarTokens(notifications, 0).map((token) => [token.typeCode, token.tag, token.titleKey, token.message])).toEqual([
            [FriendNotificationType.GAME, 'game', 'friendbar.notify.game', 'SnowStorm'],
            [FriendNotificationType.ROOM_EVENT, 'notify', 'friendbar.notify.event', 'Party']
        ]);
    });

    it('does not duplicate the messenger token when both sources report it', () => {
        const notifications = [{ typeCode: FriendNotificationType.INSTANT_MESSAGE, message: '', viewOnce: true }];

        expect(resolveFriendBarTokens(notifications, 1)).toHaveLength(1);
        expect(resolveFriendBarTokens(notifications, 0)).toHaveLength(1);
        expect(resolveFriendBarTokens(null, 0)).toEqual([]);
    });
});
