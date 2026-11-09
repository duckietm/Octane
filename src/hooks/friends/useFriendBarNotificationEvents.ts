import { FriendNotificationEvent } from '@octane/renderer';
import { useEffect, useRef } from 'react';
import { GetConfigurationValue, MessengerFriend } from '../../api';
import { useMessageEvent } from '../events';
import { useFriendBarNotificationsStore } from './friendBarNotificationsStore';

/**
 * AIR `HabboFriendBarData` FriendNotification handler: a friend's room event, achievement, quest or game goes to
 * that friend's tab, while `friendbar.notifications.enabled` is on and the friend is on the bar. Mount once (the
 * friends view does); the bar reads `useFriendBarNotificationsStore`.
 */
export const useFriendBarNotificationEvents = (onlineFriends: ReadonlyArray<MessengerFriend>) => {
    const onlineIdsRef = useRef<ReadonlySet<number>>(new Set());
    const receive = useFriendBarNotificationsStore((state) => state.receive);
    const prune = useFriendBarNotificationsStore((state) => state.prune);

    useEffect(() => {
        const ids = onlineFriends.filter(Boolean).map((friend) => friend.id);

        onlineIdsRef.current = new Set(ids);
        prune(ids);
    }, [onlineFriends, prune]);

    useMessageEvent<FriendNotificationEvent>(FriendNotificationEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !GetConfigurationValue<boolean>('friendbar.notifications.enabled', true)) return;
        if (!onlineIdsRef.current.has(parser.avatarId)) return;

        receive(parser.avatarId, parser.typeCode, parser.message);
    });
};
