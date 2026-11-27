/* @vitest-environment jsdom */

import { CreateLinkEvent, GetRoomEngine, MouseEventType, RoomObjectCategory, RoomObjectOperationType } from '@octane/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommitHandheldPlacement, DispatchHandheldTouchEvent, HANDHELD_AVATAR_ACTIONS_LINK } from './DispatchHandheldTouchEvent';

interface FakeEngine {
    activeRoomId: number;
    operation: string | null;
    dispatchMouseEvent: ReturnType<typeof vi.fn>;
    selectRoomObject: ReturnType<typeof vi.fn>;
    getSelectedRoomObjectData: () => { operation: string } | null;
    getRoomObjects: (roomId: number, category: number) => { id: number }[];
    getRoomObjectBoundingRectangle: (roomId: number, id: number) => { x: number; y: number; width: number; height: number } | null;
    areaSelectionManager: { areaSelectionState: number };
}

let engine: FakeEngine;

const touches = (...points: [number, number][]) => points.map(([clientX, clientY], identifier) => ({ identifier, clientX, clientY }));

const fire = (type: string, current: [number, number][], changed: [number, number][] = current) => {
    const event = { type, touches: touches(...current), changedTouches: touches(...changed), cancelable: true, preventDefault: vi.fn() };

    DispatchHandheldTouchEvent(event as unknown as TouchEvent);

    return event;
};

const sent = () => engine.dispatchMouseEvent.mock.calls.map((call) => call[3]);

let clock = 10_000;

beforeEach(() => {
    vi.useFakeTimers();
    clock += 10_000;
    vi.setSystemTime(clock);
    engine = {
        activeRoomId: 7,
        operation: null,
        dispatchMouseEvent: vi.fn(),
        selectRoomObject: vi.fn(),
        getSelectedRoomObjectData: () => (engine.operation ? { operation: engine.operation } : null),
        getRoomObjects: (_roomId, category) => (category === RoomObjectCategory.UNIT ? [{ id: 3 }] : []),
        getRoomObjectBoundingRectangle: () => ({ x: 90, y: 60, width: 40, height: 80 }),
        areaSelectionManager: { areaSelectionState: 0 }
    };
    vi.mocked(GetRoomEngine).mockImplementation(() => engine as never);
    vi.mocked(CreateLinkEvent).mockClear();
});

afterEach(() => {
    fire('touchcancel', []);
    vi.useRealTimers();
    vi.mocked(GetRoomEngine).mockReset();
});

describe('DispatchHandheldTouchEvent', () => {
    it('sends down, up and click for a tap, and stops the emulated mouse events', () => {
        fire('touchstart', [[100, 100]]);
        const end = fire('touchend', [], [[100, 100]]);

        expect(sent()).toEqual([MouseEventType.MOUSE_DOWN, MouseEventType.MOUSE_UP, MouseEventType.MOUSE_CLICK]);
        expect(end.preventDefault).toHaveBeenCalled();
    });

    it('pans with a drag and sends no click when the finger lifts', () => {
        fire('touchstart', [[100, 100]]);
        fire('touchmove', [[160, 120]]);
        fire('touchend', [], [[160, 120]]);

        expect(sent()).toEqual([MouseEventType.MOUSE_DOWN, MouseEventType.MOUSE_MOVE, MouseEventType.MOUSE_UP]);
    });

    it('only moves the preview on a tap while an item is placed, and the place button drops it there', () => {
        engine.operation = RoomObjectOperationType.OBJECT_PLACE;

        fire('touchstart', [[120, 140]]);
        fire('touchend', [], [[120, 140]]);

        expect(sent()).not.toContain(MouseEventType.MOUSE_CLICK);
        expect(sent().at(-1)).toBe(MouseEventType.MOUSE_MOVE);

        expect(CommitHandheldPlacement()).toBe(true);
        expect(engine.dispatchMouseEvent).toHaveBeenLastCalledWith(1, 120, 140, MouseEventType.MOUSE_CLICK, false, false, false, false);
    });

    it('does not commit when nothing is being placed', () => {
        expect(CommitHandheldPlacement()).toBe(false);
    });

    it('selects the avatar under a held finger and asks for its actions, without a click', () => {
        fire('touchstart', [[100, 100]]);
        vi.advanceTimersByTime(600);
        fire('touchend', [], [[100, 100]]);

        expect(engine.selectRoomObject).toHaveBeenCalledWith(7, 3, RoomObjectCategory.UNIT);
        expect(CreateLinkEvent).toHaveBeenCalledWith(HANDHELD_AVATAR_ACTIONS_LINK);
        expect(sent()).not.toContain(MouseEventType.MOUSE_CLICK);
    });

    it('zooms with a pinch through the room tools steps', () => {
        fire('touchstart', [[100, 100], [200, 100]]);
        fire('touchmove', [[100, 100], [260, 100]]);
        fire('touchend', [], [[100, 100], [260, 100]]);

        expect(CreateLinkEvent).toHaveBeenCalledWith('room-tools/zoom_in');
        expect(sent()).not.toContain(MouseEventType.MOUSE_CLICK);
    });
});
