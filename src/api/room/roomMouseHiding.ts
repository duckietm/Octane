import { GetRoomEngine, ObjectTileCursorUpdateMessage } from '@octane/renderer';

const HIDE_CLASS = 'octane-hide-mouse';

/** The tile cursors this command hid: a room entered later has a fresh, visible one. */
const hiddenCursors = new WeakSet<object>();
let hidden = false;
let toggleCount = 0;

export const isRoomMouseHidden = (): boolean => hidden;

/**
 * Official `:hidemouse`: the pointer and the room's tile cursor go away, and come back when the command is given
 * again. Meant for filming and screenshots.
 */
export const toggleRoomMouseHidden = (): boolean => {
    hidden = !hidden;

    if (typeof document !== 'undefined') document.body.classList.toggle(HIDE_CLASS, hidden);

    const roomEngine = GetRoomEngine();
    const cursor = roomEngine?.getRoomObjectCursor?.(roomEngine.activeRoomId) ?? null;

    // The cursor's logic only knows "toggle", so it is flipped only when its state differs from the wanted one.
    if (cursor && hiddenCursors.has(cursor) !== hidden) {
        cursor.logic?.processUpdateMessage(new ObjectTileCursorUpdateMessage(null, 0, false, `hidemouse-${++toggleCount}`, true));

        if (hidden) hiddenCursors.add(cursor);
        else hiddenCursors.delete(cursor);
    }

    return hidden;
};
