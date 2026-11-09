import { GetSessionDataManager, GroupConfirmMemberRemoveEvent, GroupRemoveMemberComposer } from '@octane/renderer';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { LocalizeText, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { useGroupMemberRemoval } from './useGroupMemberRemoval';

/**
 * Leaving a group the official way (GroupDetailsCtrl.onLeave -> handleUserKick): the server is first asked what leaving costs
 * (GroupConfirmRemoveMember for oneself), its answer names the furni left in the home room, and only a confirmed dialog sends
 * GroupRemoveMember. The request goes through the one shared removal transaction (useGroupMemberRemoval), so the members window
 * and every window that offers Leave can never answer each other's replies.
 *
 * `shownGroupId` is the group the window shows now: a confirmation is only valid while that group is still shown.
 */
export const useGroupLeave = (shownGroupId: number, onLeft: () => void = null) => {
    const { showConfirm = null } = useNotification();
    const shownGroupIdRef = useRef<number>(shownGroupId);
    const onLeftRef = useRef(onLeft);
    const confirmOpenRef = useRef<boolean>(false);
    const { request, claimReply, isCurrentSession } = useGroupMemberRemoval();

    // Read by the confirmation callbacks; refreshed before any of them can run.
    useLayoutEffect(() => {
        shownGroupIdRef.current = shownGroupId;
        onLeftRef.current = onLeft;
    });

    // A confirmation belongs to the group it was asked for: showing another group retires it.
    useEffect(() => {
        confirmOpenRef.current = false;
    }, [shownGroupId]);

    useEffect(
        () => () => {
            shownGroupIdRef.current = 0;
        },
        []
    );

    useMessageEvent<GroupConfirmMemberRemoveEvent>(GroupConfirmMemberRemoveEvent, (event) => {
        const parser = event.getParser();
        const removal = claimReply(parser.userId);

        if (!removal || removal.groupId !== shownGroupIdRef.current) return;

        let isSent = false;

        confirmOpenRef.current = true;
        showConfirm(
            LocalizeText(parser.furnitureCount > 0 ? 'group.leaveconfirm.desc' : 'group.leaveconfirm_nofurni.desc', ['amount'], [parser.furnitureCount.toString()]),
            () => {
                confirmOpenRef.current = false;

                // One removal per confirmation, and only while that group is shown and the same user is signed in.
                if (isSent || removal.groupId !== shownGroupIdRef.current || !isCurrentSession(removal)) return;

                isSent = true;
                SendMessageComposer(new GroupRemoveMemberComposer(removal.groupId, removal.userId));

                if (onLeftRef.current) onLeftRef.current();
            },
            () => {
                confirmOpenRef.current = false;
            },
            LocalizeText('generic.ok'),
            LocalizeText('generic.cancel'),
            LocalizeText('group.leaveconfirm.title')
        );
    });

    return useCallback(() => {
        const groupId = shownGroupIdRef.current;

        if (confirmOpenRef.current || groupId <= 0) return;

        request(groupId, GetSessionDataManager().userId);
    }, [request]);
};
