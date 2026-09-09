import { ChangeQueueMessageComposer, RoomQueueStatusEvent } from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer, VisitDesktop } from '../../api';
import { useMessageEvent } from '../events';
import { usePurse } from '../purse';

/** `RoomSessionQueueEvent`: 1 = spectator queue, 2 = visitor queue. */
export const ROOM_QUEUE_TARGET_SPECTATOR = 1;
export const ROOM_QUEUE_TARGET_VISITOR = 2;

/** `RoomSessionQueueEvent`: `c` = the club queue, `d` = the normal queue. */
export const ROOM_QUEUE_TYPE_CLUB = 'c';
export const ROOM_QUEUE_TYPE_NORMAL = 'd';

export interface RoomQueueState {
    roomId: number;
    target: number;
    position: number;
    isClubQueue: boolean;
}

/**
 * AIR 13 room queue (`RoomQueueWidget` / `RoomQueueWidgetHandler` +
 * `RoomQueueStatus`, our header 2208).
 *
 * The handler picks the queue set that is active, then reads the size of the
 * club queue when the habbo has HC and that queue exists, otherwise the normal
 * one, and shows `size + 1` as the position.
 */
export const readRoomQueueState = (
    roomId: number,
    target: number,
    queueTypes: readonly string[],
    getQueueSize: (queueType: string) => number,
    hasHabboClub: boolean
): RoomQueueState | null => {
    if (target !== ROOM_QUEUE_TARGET_SPECTATOR && target !== ROOM_QUEUE_TARGET_VISITOR) return null;
    if (!queueTypes.length) return null;

    let isClubQueue = false;
    let position: number;

    if (queueTypes.length > 1) {
        if (hasHabboClub && queueTypes.indexOf(ROOM_QUEUE_TYPE_CLUB) !== -1) {
            position = getQueueSize(ROOM_QUEUE_TYPE_CLUB) + 1;
            isClubQueue = true;
        } else {
            position = getQueueSize(ROOM_QUEUE_TYPE_NORMAL) + 1;
        }
    } else {
        position = getQueueSize(queueTypes[0]) + 1;
        isClubQueue = queueTypes[0] === ROOM_QUEUE_TYPE_CLUB;
    }

    return { roomId, target, position, isClubQueue };
};

const useRoomQueueState = () => {
    const [queue, setQueue] = useState<RoomQueueState | null>(null);
    const { purse = null } = usePurse();

    const hasHabboClub = (purse?.clubDays ?? 0) > 0;

    useMessageEvent<RoomQueueStatusEvent>(RoomQueueStatusEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const queueSet = parser.getQueueSet(parser.activeTarget) ?? parser.queueSets[0];

        if (!queueSet) {
            setQueue(null);

            return;
        }

        setQueue(readRoomQueueState(parser.flatId, queueSet.target, queueSet.queueTypes, (type) => queueSet.getQueueSize(type), hasHabboClub));
    });

    /** `RWRQM_EXIT_QUEUE`: the official widget quits the pending room session. */
    const exitQueue = useCallback(() => {
        setQueue(null);
        VisitDesktop();
    }, []);

    /** `RWRQM_CHANGE_TO_SPECTATOR_QUEUE` / `RWRQM_CHANGE_TO_VISITOR_QUEUE`. */
    const changeQueue = useCallback(() => {
        if (!queue) return;

        SendMessageComposer(
            new ChangeQueueMessageComposer(queue.target === ROOM_QUEUE_TARGET_VISITOR ? ROOM_QUEUE_TARGET_SPECTATOR : ROOM_QUEUE_TARGET_VISITOR)
        );
        setQueue(null);
    }, [queue]);

    return { queue, hasHabboClub, exitQueue, changeQueue };
};

export const useRoomQueue = () => useSharedHook(useRoomQueueState);

registerSharedHook(useRoomQueueState);
