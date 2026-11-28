import { CreateLinkEvent, GetRoomEngine, MouseEventType, RoomAreaSelectionManager, RoomObjectCategory, RoomObjectOperationType } from '@octane/renderer';
import { pickSmallestContaining, RoomGestureIntent, RoomTouchGesture, toTouchPoints } from '../../handheld/roomTouchGesture';

/**
 * Room input in the phone layout. The finger rules live in `RoomTouchGesture`; this file only turns its
 * intents into the mouse events the room engine already understands:
 *  press -> MOUSE_DOWN, drag -> MOUSE_MOVE (the engine pans, or moves the item being placed), release ->
 *  MOUSE_UP, tap -> MOUSE_CLICK (+ DOUBLE_CLICK), zoom -> the room tools' zoom steps, hold -> the object
 *  under the finger is selected, which opens its infostand without walking there.
 * While an item is being placed or moved a tap only moves the preview; `CommitHandheldPlacement` drops it.
 */

const CANVAS_ID = 1;
const PICK_ORDER = [RoomObjectCategory.UNIT, RoomObjectCategory.FLOOR, RoomObjectCategory.WALL];

/** Asks the avatar widget to open the drawer of the avatar a hold selected, so all its actions show at once. */
export const HANDHELD_AVATAR_ACTIONS_LINK = 'avatar-info/handheld-actions';

const gesture = new RoomTouchGesture();
let holdTimer: ReturnType<typeof setTimeout> | null = null;

const send = (type: string, x: number, y: number) => GetRoomEngine().dispatchMouseEvent(CANVAS_ID, x, y, type, false, false, false, false);

/** Where the preview of the item being placed was last put; the place button drops it there. */
let previewPoint: { x: number; y: number } | null = null;
let previewFrames = 0;
let previewFrameRequest: number | null = null;

const PREVIEW_MOVE_FRAMES = 3;

/**
 * Puts the placement preview under a point. The room canvas drops a pointer move in three cases a tap or a first
 * touch always hits: it reads at most one move per drawn frame, it ignores a move to the very point of the event
 * before it (the press and release of the tap), and it reports the first move over a surface as "pointer entered"
 * instead of a move. So the move is walked in over the next animation frames from two pixels beside the point:
 * each step is a new position in a new frame, and the last one is the point itself.
 */
const movePlacementPreview = (x: number, y: number) => {
    previewPoint = { x, y };
    previewFrames = PREVIEW_MOVE_FRAMES;

    // A drag already moves every frame, so this one usually gets through; the steps below cover the tap.
    send(MouseEventType.MOUSE_MOVE, x, y);

    if (typeof requestAnimationFrame !== 'function') return;

    // A new point restarts the walk, so a request that never ran (a hidden tab) cannot block the next one.
    if (previewFrameRequest !== null) cancelAnimationFrame(previewFrameRequest);

    const step = () => {
        previewFrameRequest = null;

        if (!previewPoint || previewFrames <= 0 || !isRoomObjectPlacementActive()) return;

        previewFrames--;
        send(MouseEventType.MOUSE_MOVE, previewPoint.x + previewFrames, previewPoint.y);

        if (previewFrames > 0) previewFrameRequest = requestAnimationFrame(step);
    };

    previewFrameRequest = requestAnimationFrame(step);
};

/**
 * A placement just started and no finger has pointed anywhere yet: the item is shown in the middle of the visible
 * room, so there is something to see and to drag before the first touch.
 */
export const ShowHandheldPlacementPreview = (): void => {
    if (!isRoomObjectPlacementActive() || typeof window === 'undefined') return;

    movePlacementPreview(Math.round(window.innerWidth / 2), Math.round(window.innerHeight * 0.45));
};

/** An item from the inventory or catalogue is being placed, or a placed one is being moved. */
export const isRoomObjectPlacementActive = (): boolean => {
    const engine = GetRoomEngine();
    const selected = engine?.getSelectedRoomObjectData?.(engine.activeRoomId);
    const operation = selected?.operation;

    return operation === RoomObjectOperationType.OBJECT_PLACE || operation === RoomObjectOperationType.OBJECT_MOVE || operation === RoomObjectOperationType.OBJECT_MOVE_TO;
};

const areaSelectionState = (): number | null => GetRoomEngine()?.areaSelectionManager?.areaSelectionState ?? null;

const blurTextField = () => {
    const active = document.activeElement;

    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) active.blur();
};

/** The object a hold meant: avatars first (they stand on furni), then floor and wall items. */
const objectUnderFinger = (x: number, y: number): { id: number; category: number } | null => {
    const engine = GetRoomEngine();
    const roomId = engine.activeRoomId;

    for (const category of PICK_ORDER) {
        const candidates = (engine.getRoomObjects(roomId, category) ?? [])
            .filter((roomObject) => roomObject && roomObject.id >= 0)
            .map((roomObject) => ({ id: roomObject.id, bounds: engine.getRoomObjectBoundingRectangle(roomId, roomObject.id, category, CANVAS_ID) }));
        const picked = pickSmallestContaining(candidates, x, y);

        if (picked) return { id: picked.id, category };
    }

    return null;
};

const onHold = (x: number, y: number) => {
    if (isRoomObjectPlacementActive()) return;

    const area = areaSelectionState();

    if (area === RoomAreaSelectionManager.AWAITING_MOUSE_DOWN || area === RoomAreaSelectionManager.SELECTING) return;

    const target = objectUnderFinger(x, y);

    if (!target) return;

    const engine = GetRoomEngine();

    engine.selectRoomObject(engine.activeRoomId, target.id, target.category);

    if (target.category === RoomObjectCategory.UNIT) CreateLinkEvent(HANDHELD_AVATAR_ACTIONS_LINK);
};

const perform = (intent: RoomGestureIntent) => {
    switch (intent.type) {
        case 'press':
            send(MouseEventType.MOUSE_DOWN, intent.x, intent.y);
            return;
        case 'drag':
            if (isRoomObjectPlacementActive()) {
                movePlacementPreview(intent.x, intent.y);
                return;
            }

            send(MouseEventType.MOUSE_MOVE, intent.x, intent.y);
            return;
        case 'release':
            send(MouseEventType.MOUSE_UP, intent.x, intent.y);

            // The engine finishes a wired area selection on a click, which a drag never sends on its own.
            if (intent.moved && areaSelectionState() === RoomAreaSelectionManager.SELECTING) send(MouseEventType.MOUSE_CLICK, intent.x, intent.y);
            return;
        case 'tap':
            if (isRoomObjectPlacementActive()) {
                movePlacementPreview(intent.x, intent.y);
                return;
            }

            blurTextField();
            send(MouseEventType.MOUSE_CLICK, intent.x, intent.y);

            if (intent.double) send(MouseEventType.DOUBLE_CLICK, intent.x, intent.y);
            return;
        case 'hold':
            onHold(intent.x, intent.y);
            return;
        case 'zoom':
            CreateLinkEvent(intent.direction > 0 ? 'room-tools/zoom_in' : 'room-tools/zoom_out');
            return;
    }
};

const clearHoldTimer = () => {
    if (holdTimer === null) return;

    clearTimeout(holdTimer);
    holdTimer = null;
};

const scheduleHold = () => {
    clearHoldTimer();

    const at = gesture.holdAt;

    if (at === null) return;

    holdTimer = setTimeout(
        () => {
            holdTimer = null;
            gesture.pollHold(Date.now()).forEach(perform);
        },
        Math.max(0, at - Date.now())
    );
};

export const DispatchHandheldTouchEvent = (event: TouchEvent): void => {
    const now = Date.now();
    const touches = toTouchPoints(event.touches);

    // Without this the browser follows the touch with emulated mouse events and a click, and the room gets it twice.
    if (event.type !== 'touchstart' && event.cancelable) event.preventDefault();

    let intents: readonly RoomGestureIntent[] = [];

    switch (event.type) {
        case 'touchstart':
            intents = gesture.begin(touches, now);
            break;
        case 'touchmove':
            intents = gesture.move(touches, now);
            break;
        case 'touchend':
            intents = gesture.finish(touches, toTouchPoints(event.changedTouches)[0] ?? null, now);
            break;
        case 'touchcancel':
            intents = gesture.cancel();
            break;
        default:
            return;
    }

    intents.forEach(perform);

    if (gesture.holdAt === null) clearHoldTimer();
    else if (event.type === 'touchstart') scheduleHold();
};

/**
 * Drops the item being placed or moved where its preview stands. The engine places it directly: a simulated click
 * at the preview is not reliable (it is hit-tested again, and a miss cancels the whole placement). False when
 * nothing is being placed or the preview is not on a valid spot; the placement then stays active.
 */
export const CommitHandheldPlacement = (): boolean => {
    if (!isRoomObjectPlacementActive()) return false;

    const engine = GetRoomEngine();

    if (typeof engine.commitActiveObjectPlacement === 'function') {
        if (!engine.commitActiveObjectPlacement()) return false;

        previewPoint = null;
        previewFrames = 0;

        return true;
    }

    // An older renderer without the direct call: the click a mouse would make at the preview.
    const { x, y } = previewPoint ?? gesture.lastPoint;

    previewPoint = null;
    previewFrames = 0;
    send(MouseEventType.MOUSE_CLICK, x, y);

    return true;
};
