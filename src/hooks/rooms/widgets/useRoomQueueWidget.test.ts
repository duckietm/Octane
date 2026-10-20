/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { IRoomQueueSet, ROOM_QUEUE_TARGET_SPECTATOR, ROOM_QUEUE_TARGET_VISITOR, resolveRoomQueueStatus } from './useRoomQueueWidget';

const queueSet = (target: number, queues: Record<string, number>): IRoomQueueSet => ({
    target,
    queueTypes: Object.keys(queues),
    getQueueSize: (queueType: string) => queues[queueType] ?? 0
});

describe('resolveRoomQueueStatus (official RoomQueueWidgetHandler)', () => {
    it('shows the size of the only queue type plus one', () => {
        expect(resolveRoomQueueStatus(queueSet(ROOM_QUEUE_TARGET_VISITOR, { d: 3 }), ROOM_QUEUE_TARGET_VISITOR, false)).toEqual({
            target: ROOM_QUEUE_TARGET_VISITOR,
            position: 4,
            isActive: true,
            isClubQueue: false
        });
    });

    it('never flags a single queue type as the club queue, as the official handler does', () => {
        expect(resolveRoomQueueStatus(queueSet(ROOM_QUEUE_TARGET_VISITOR, { c: 0 }), ROOM_QUEUE_TARGET_VISITOR, true).isClubQueue).toBe(false);
    });

    it('reads the club queue for a club member when both types are listed', () => {
        const status = resolveRoomQueueStatus(queueSet(ROOM_QUEUE_TARGET_VISITOR, { c: 1, d: 7 }), ROOM_QUEUE_TARGET_VISITOR, true);

        expect(status.position).toBe(2);
        expect(status.isClubQueue).toBe(true);
    });

    it('reads the normal queue for a non member when both types are listed', () => {
        const status = resolveRoomQueueStatus(queueSet(ROOM_QUEUE_TARGET_VISITOR, { c: 1, d: 7 }), ROOM_QUEUE_TARGET_VISITOR, false);

        expect(status.position).toBe(8);
        expect(status.isClubQueue).toBe(false);
    });

    it('marks a set inactive when its target is not the active one', () => {
        expect(resolveRoomQueueStatus(queueSet(ROOM_QUEUE_TARGET_SPECTATOR, { d: 0 }), ROOM_QUEUE_TARGET_VISITOR, false).isActive).toBe(false);
    });

    it('ignores unknown targets', () => {
        expect(resolveRoomQueueStatus(queueSet(5, { d: 0 }), 5, false)).toBeNull();
        expect(resolveRoomQueueStatus(null, ROOM_QUEUE_TARGET_VISITOR, false)).toBeNull();
    });
});
