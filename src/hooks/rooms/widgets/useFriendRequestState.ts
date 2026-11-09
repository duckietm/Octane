import { RoomObjectCategory, RoomObjectUserType } from '@octane/renderer';
import { useEffect, useMemo, useState } from 'react';
import { GetRoomSession, MessengerRequest } from '../../../api';
import { useFriends } from '../../friends';
import { useUserAddedEvent, useUserRemovedEvent } from '../engine';

export interface ActiveFriendRequest {
    roomIndex: number;
    request: MessengerRequest;
}

/**
 * State + event subscriptions for the friend-request room widget.
 * Pure imperative action (hideFriendRequest) lives in
 * useFriendRequestActions.
 */
export const useFriendRequestState = () => {
    const [activeRequests, setActiveRequests] = useState<ActiveFriendRequest[]>([]);
    const { requests = [], dismissedRequestIds = [] } = useFriends();

    const displayedRequests = useMemo(
        () => activeRequests.filter((entry) => dismissedRequestIds.indexOf(entry.request.requesterUserId) === -1),
        [activeRequests, dismissedRequestIds]
    );

    useUserAddedEvent(true, (event) => {
        if (event.category !== RoomObjectCategory.UNIT) return;

        const userData = GetRoomSession()?.userDataManager?.getUserDataByIndex(event.id);

        if (!userData || userData.type !== RoomObjectUserType.getTypeNumber(RoomObjectUserType.USER)) return;

        const request = requests.find((r) => r.requesterUserId === userData.webID);

        if (!request) return;

        setActiveRequests((prev) => {
            if (prev.find((entry) => entry.request.requesterUserId === userData.webID)) return prev;

            return [...prev, { roomIndex: userData.roomIndex, request }];
        });
    });

    useUserRemovedEvent(true, (event) => {
        if (event.category !== RoomObjectCategory.UNIT) return;

        setActiveRequests((prev) => {
            const index = prev.findIndex((entry) => entry.roomIndex === event.id);

            if (index === -1) return prev;

            const next = [...prev];
            next.splice(index, 1);
            return next;
        });
    });

    useEffect(() => {
        const session = GetRoomSession();

        if (!session) return;

        const next: ActiveFriendRequest[] = [];

        for (const request of requests) {
            const userData = session.userDataManager?.getUserData(request.requesterUserId);

            if (!userData) continue;

            next.push({ roomIndex: userData.roomIndex, request });
        }

        setActiveRequests(next);
    }, [requests]);

    return { displayedRequests };
};
