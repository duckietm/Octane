import { ChangeQueueMessageComposer, GetSessionDataManager, RoomQueueStatusEvent, RoomSessionEvent } from '@octane/renderer';
import { useState } from 'react';
import { GoToDesktop, SendMessageComposer } from '../../../api';
import { useMessageEvent, useOctaneEvent } from '../../events';

/** Official `RoomSessionQueueEvent` targets and queue types (`lf.const_176` / `const_189`, `c` / `d`). */
export const ROOM_QUEUE_TARGET_SPECTATOR = 1;
export const ROOM_QUEUE_TARGET_VISITOR = 2;
export const ROOM_QUEUE_TYPE_CLUB = 'c';
export const ROOM_QUEUE_TYPE_NORMAL = 'd';

export interface IRoomQueueSet {
    target: number;
    queueTypes: string[];
    getQueueSize(queueType: string): number;
}

export interface IRoomQueueStatus {
    /** `ROOM_QUEUE_TARGET_VISITOR` or `ROOM_QUEUE_TARGET_SPECTATOR`. */
    target: number;
    position: number;
    isActive: boolean;
    /** Whether the position is the one of the HC queue (`room.queue.position.hc`). */
    isClubQueue: boolean;
}

/**
 * Official `RoomQueueWidgetHandler` (QUEUE_STATUS): one status per queue set. With more than one queue
 * type in the set a club member reads the club queue, everybody else the normal one; with a single
 * type that one is read. The position is the queue size plus one, and the set is active when its
 * target is the parser's active target. Unknown targets are ignored.
 */
export const resolveRoomQueueStatus = (queueSet: IRoomQueueSet, activeTarget: number, hasClub: boolean): IRoomQueueStatus => {
    if (!queueSet) return null;

    if (queueSet.target !== ROOM_QUEUE_TARGET_VISITOR && queueSet.target !== ROOM_QUEUE_TARGET_SPECTATOR) return null;

    const queueTypes = queueSet.queueTypes ?? [];
    let position: number;
    let isClubQueue = false;

    if (queueTypes.length > 1) {
        if (hasClub && queueTypes.indexOf(ROOM_QUEUE_TYPE_CLUB) !== -1) {
            position = (queueSet.getQueueSize(ROOM_QUEUE_TYPE_CLUB) ?? 0) + 1;
            isClubQueue = true;
        } else {
            position = (queueSet.getQueueSize(ROOM_QUEUE_TYPE_NORMAL) ?? 0) + 1;
        }
    } else {
        position = (queueSet.getQueueSize(queueTypes[0]) ?? 0) + 1;
    }

    return { target: queueSet.target, position, isActive: queueSet.target === activeTarget, isClubQueue };
};

/**
 * Official `RoomQueueWidget`: the window shown while the habbo waits for a full room. It keeps the
 * target and position of the active queue set, leaves through the session quit (our desktop view,
 * which the server also treats as "leave the queue") and switches between the visitor and the
 * spectator queue with `ChangeQueue`.
 */
const useRoomQueueWidgetState = () => {
    const [status, setStatus] = useState<IRoomQueueStatus>(null);

    useMessageEvent<RoomQueueStatusEvent>(RoomQueueStatusEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const hasClub = (GetSessionDataManager()?.clubLevel ?? 0) > 0;

        for (const queueSet of parser.queueSets ?? []) {
            const next = resolveRoomQueueStatus(queueSet, parser.activeTarget, hasClub);

            if (!next) continue;

            // Official widget: an inactive set only refreshes the club flag, the shown queue stays.
            setStatus((previous) => (next.isActive || !previous ? next : { ...previous, isClubQueue: next.isClubQueue }));
        }
    });

    // Entering a room (the forward once a slot frees, or any other room) ends the wait.
    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.CREATED, () => setStatus(null));

    const leaveQueue = () => {
        setStatus(null);
        GoToDesktop();
    };

    const changeQueue = () => {
        if (!status) return;

        const target = status.target === ROOM_QUEUE_TARGET_VISITOR ? ROOM_QUEUE_TARGET_SPECTATOR : ROOM_QUEUE_TARGET_VISITOR;

        SendMessageComposer(new ChangeQueueMessageComposer(target));
    };

    return { status, leaveQueue, changeQueue };
};

export const useRoomQueueWidget = useRoomQueueWidgetState;
