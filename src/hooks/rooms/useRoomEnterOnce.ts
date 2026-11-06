import { RoomSessionEvent } from '@octane/renderer';
import { useCallback, useRef } from 'react';
import { useOctaneEvent } from '../events';

/**
 * Tells a GetGuestRoomResult consumer whether its roomEnter answer is the room's first one this session.
 *
 * The server sets roomEnter for any GetGuestRoom request that is not exactly (roomId, false, true), and the room info
 * window, its mute and staff pick toggles and the room thumbnail all ask (roomId, false, false) to refresh the data.
 * Each refresh used to replay the entry: the entry card, the competition reset, the room entry ad, the group lookup.
 * The handled room is forgotten when a room session starts or ends, so the next visit counts again.
 */
export const useRoomEnterOnce = () => {
    const handledRoomIdRef = useRef(0);

    useOctaneEvent<RoomSessionEvent>([RoomSessionEvent.STARTED, RoomSessionEvent.ENDED], () => {
        handledRoomIdRef.current = 0;
    });

    return useCallback((roomId: number) => {
        if (handledRoomIdRef.current === roomId) return false;

        handledRoomIdRef.current = roomId;

        return true;
    }, []);
};
