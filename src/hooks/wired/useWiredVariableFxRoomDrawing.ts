import { GetRoomEngine, IRoomObjectVariableFxEntry, RoomEngineObjectEvent, RoomObjectCategory } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { useOctaneEvent } from '../events';
import { WiredVariableFxRoomDrawing } from './wiredVariableFxRoomDrawing';
import { useWiredVariableFxStore } from './wiredVariableFxStore';

const roomEngineTarget = {
    setRoomObjectVariableFx: (roomId: number, objectId: number, category: number, entries: IRoomObjectVariableFxEntry[]): boolean => {
        const engine = GetRoomEngine();

        // A renderer bundle from before the fx drawing has no such call; nothing to draw then.
        if (typeof engine?.setRoomObjectVariableFx !== 'function') return false;

        return engine.setRoomObjectVariableFx(roomId, objectId, category, entries);
    }
};

/**
 * Draws the store's variable fx in the room the AIR way: the room renderer stacks them as sprites in
 * the holders' visualizations and fades them (150 ms in, 350 ms out). This hook decides what shows
 * (show mode, hover, update mask), wakes up when a "when it changes" fx is due to hide, and hands
 * objects that enter the room later the fx they hold.
 */
export const useWiredVariableFxRoomDrawing = (roomId: number | null) => {
    const configs = useWiredVariableFxStore((state) => state.configs);
    const statuses = useWiredVariableFxStore((state) => state.statuses);
    const hoveredHolder = useWiredVariableFxStore((state) => state.hoveredHolder);
    const [drawing] = useState(() => new WiredVariableFxRoomDrawing(roomEngineTarget, { unit: RoomObjectCategory.UNIT, floor: RoomObjectCategory.FLOOR }));
    const [wakeCount, setWakeCount] = useState(0);

    useEffect(() => {
        if (roomId === null) return;

        const wakeAt = drawing.sync(roomId, configs, statuses, hoveredHolder, Date.now());

        if (wakeAt === null) return;

        const timer = window.setTimeout(() => setWakeCount((count) => count + 1), Math.max(0, wakeAt - Date.now()) + 10);

        return () => window.clearTimeout(timer);
    }, [drawing, roomId, configs, statuses, hoveredHolder, wakeCount]);

    useEffect(() => {
        if (roomId === null) return;

        return () => drawing.clear(roomId);
    }, [drawing, roomId]);

    useOctaneEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.ADDED, (event) => {
        if (roomId === null || event.roomId !== roomId) return;
        if (event.category !== RoomObjectCategory.UNIT && event.category !== RoomObjectCategory.FLOOR) return;

        drawing.reapply(roomId, event.category === RoomObjectCategory.UNIT, event.objectId);
    });
};
