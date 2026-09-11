import { FriendNotificationEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFriendNotificationsStore, useFriends, useMessageEvent } from '../../hooks';
import { FriendBarView } from './views/friends-bar/FriendsBarView';
import { FriendsListView } from './views/friends-list/FriendsListView';
import { FriendsMessengerView } from './views/messenger/FriendsMessengerView';

const FRIEND_BAR_TARGET_IDS = ['toolbar-friend-bar-container-desktop'];

export const FriendsView: FC<{}> = (props) => {
    const { settings = null, onlineFriends = [], requests = [] } = useFriends();
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    // Official HabboFriendBarData.onFriendNotification: the packet turns into a
    // token on that friend's bar tab (event / achievement / quest / game).
    useMessageEvent<FriendNotificationEvent>(FriendNotificationEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        useFriendNotificationsStore.getState().pushNotification(parser.avatarId, parser.typeCode, parser.message);
    });

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const resolveTarget = () => {
            for (const id of FRIEND_BAR_TARGET_IDS) {
                const element = document.getElementById(id);

                if (element) {
                    setPortalTarget((previous) => (previous === element ? previous : element));
                    return;
                }
            }

            setPortalTarget(null);
        };

        resolveTarget();

        const observer = new MutationObserver(resolveTarget);

        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, []);

    if (!settings) return null;

    return (
        <>
            {portalTarget && createPortal(<FriendBarView onlineFriends={onlineFriends} requestsCount={requests.length} />, portalTarget)}
            <FriendsListView />
            <FriendsMessengerView />
        </>
    );
};
