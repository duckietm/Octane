type RoomThumbnailListener = (revision: number) => void;

const revisions = new Map<number, number>();
const listeners = new Map<number, Set<RoomThumbnailListener>>();

export const GetRoomThumbnailRevision = (roomId: number): number => revisions.get(roomId) ?? 0;

export const RefreshRoomThumbnail = (roomId: number, revision: number = Date.now()): void => {
    if (roomId <= 0) return;

    revisions.set(roomId, revision);

    for (const listener of listeners.get(roomId) ?? []) listener(revision);
};

export const SubscribeRoomThumbnail = (roomId: number, listener: RoomThumbnailListener): (() => void) => {
    let roomListeners = listeners.get(roomId);

    if (!roomListeners) {
        roomListeners = new Set();
        listeners.set(roomId, roomListeners);
    }

    roomListeners.add(listener);

    return () => {
        roomListeners.delete(listener);
        if (!roomListeners.size) listeners.delete(roomId);
    };
};
