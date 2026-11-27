import { describe, expect, it } from 'vitest';
import { pickSmallestContaining, RoomTouchGesture, toTouchPoints } from './roomTouchGesture';

const finger = (x: number, y: number, id = 0) => ({ id, x, y });

const types = (intents: readonly { type: string }[]) => intents.map((intent) => intent.type);

describe('RoomTouchGesture', () => {
    it('turns a still finger into press, release and tap', () => {
        const gesture = new RoomTouchGesture();

        expect(gesture.begin([finger(100, 100)], 0)).toEqual([{ type: 'press', x: 100, y: 100 }]);
        expect(gesture.move([finger(104, 103)], 50)).toEqual([]);
        expect(gesture.finish([], finger(104, 103), 120)).toEqual([
            { type: 'release', x: 104, y: 103, moved: false },
            { type: 'tap', x: 104, y: 103, double: false }
        ]);
    });

    it('pans on a drag and never taps when the finger lifts', () => {
        const gesture = new RoomTouchGesture();

        gesture.begin([finger(100, 100)], 0);

        expect(gesture.move([finger(140, 100)], 40)).toEqual([{ type: 'drag', x: 140, y: 100 }]);
        expect(gesture.move([finger(150, 110)], 60)).toEqual([{ type: 'drag', x: 150, y: 110 }]);
        expect(gesture.finish([], finger(150, 110), 90)).toEqual([{ type: 'release', x: 150, y: 110, moved: true }]);
    });

    it('makes a double tap of two quick taps close together, and only once', () => {
        const gesture = new RoomTouchGesture();

        gesture.begin([finger(50, 50)], 0);
        gesture.finish([], finger(50, 50), 80);
        gesture.begin([finger(55, 52)], 200);

        expect(gesture.finish([], finger(55, 52), 260)[1]).toEqual({ type: 'tap', x: 55, y: 52, double: true });

        gesture.begin([finger(55, 52)], 400);

        expect(gesture.finish([], finger(55, 52), 450)[1]).toMatchObject({ double: false });
    });

    it('does not pair taps that are too slow or too far apart', () => {
        const slow = new RoomTouchGesture();

        slow.begin([finger(50, 50)], 0);
        slow.finish([], finger(50, 50), 50);
        slow.begin([finger(50, 50)], 600);
        expect(slow.finish([], finger(50, 50), 650)[1]).toMatchObject({ double: false });

        const far = new RoomTouchGesture();

        far.begin([finger(50, 50)], 0);
        far.finish([], finger(50, 50), 50);
        far.begin([finger(200, 50)], 150);
        expect(far.finish([], finger(200, 50), 200)[1]).toMatchObject({ double: false });
    });

    it('holds a still finger after the hold time, and then only releases', () => {
        const gesture = new RoomTouchGesture({ holdMs: 500 });

        gesture.begin([finger(80, 90)], 1000);

        expect(gesture.holdAt).toBe(1500);
        expect(gesture.pollHold(1400)).toEqual([]);
        expect(gesture.pollHold(1500)).toEqual([{ type: 'hold', x: 80, y: 90 }]);
        expect(gesture.move([finger(140, 90)], 1600)).toEqual([]);
        expect(gesture.finish([], finger(140, 90), 1700)).toEqual([{ type: 'release', x: 140, y: 90, moved: false }]);
    });

    it('never holds once the finger dragged', () => {
        const gesture = new RoomTouchGesture({ holdMs: 500 });

        gesture.begin([finger(80, 90)], 0);
        gesture.move([finger(120, 90)], 100);

        expect(gesture.holdAt).toBeNull();
        expect(gesture.pollHold(900)).toEqual([]);
    });

    it('releases the open press when a second finger arrives, then zooms in steps', () => {
        const gesture = new RoomTouchGesture({ zoomStepRatio: 1.5 });

        gesture.begin([finger(100, 100, 0)], 0);

        expect(gesture.begin([finger(100, 100, 0), finger(200, 100, 1)], 30)).toEqual([{ type: 'release', x: 100, y: 100, moved: true }]);
        expect(gesture.isPinching).toBe(true);
        expect(gesture.move([finger(100, 100, 0), finger(240, 100, 1)], 60)).toEqual([]);
        expect(gesture.move([finger(100, 100, 0), finger(260, 100, 1)], 80)).toEqual([{ type: 'zoom', direction: 1, x: 180, y: 100 }]);
        // The next step is measured from where the last one happened.
        expect(gesture.move([finger(100, 100, 0), finger(340, 100, 1)], 100)).toEqual([{ type: 'zoom', direction: 1, x: 220, y: 100 }]);
        expect(gesture.move([finger(100, 100, 0), finger(250, 100, 1)], 120)).toEqual([{ type: 'zoom', direction: -1, x: 175, y: 100 }]);
    });

    it('does not tap or press while the fingers of a pinch come off one by one', () => {
        const gesture = new RoomTouchGesture();

        gesture.begin([finger(100, 100, 0), finger(200, 100, 1)], 0);

        expect(gesture.finish([finger(100, 100, 0)], finger(200, 100, 1), 50)).toEqual([]);
        expect(gesture.begin([finger(100, 100, 0), finger(210, 100, 2)], 60)).toEqual([]);
        expect(gesture.finish([], finger(100, 100, 0), 90)).toEqual([]);
        expect(types(gesture.begin([finger(30, 30)], 200))).toEqual(['press']);
    });

    it('releases without a tap when the browser cancels the touch', () => {
        const gesture = new RoomTouchGesture();

        gesture.begin([finger(10, 20)], 0);

        expect(gesture.cancel()).toEqual([{ type: 'release', x: 10, y: 20, moved: true }]);
        expect(gesture.cancel()).toEqual([]);
        expect(gesture.finish([], finger(10, 20), 40)).toEqual([]);
    });

    it('remembers the last point the finger touched for the placement commit', () => {
        const gesture = new RoomTouchGesture();

        gesture.begin([finger(10, 10)], 0);
        gesture.move([finger(60, 70)], 40);
        gesture.finish([], finger(60, 70), 60);

        expect(gesture.lastPoint).toEqual({ x: 60, y: 70 });
    });
});

describe('toTouchPoints', () => {
    it('reads a touch list into plain points', () => {
        expect(toTouchPoints([{ identifier: 3, clientX: 1, clientY: 2 }])).toEqual([{ id: 3, x: 1, y: 2 }]);
        expect(toTouchPoints(null)).toEqual([]);
    });
});

describe('pickSmallestContaining', () => {
    it('picks the smallest box under the finger and skips empty boxes', () => {
        const candidates = [
            { id: 1, bounds: { x: 0, y: 0, width: 200, height: 200 } },
            { id: 2, bounds: { x: 40, y: 40, width: 30, height: 60 } },
            { id: 3, bounds: null },
            { id: 4, bounds: { x: 45, y: 45, width: 0, height: 0 } }
        ];

        expect(pickSmallestContaining(candidates, 50, 50)?.id).toBe(2);
        expect(pickSmallestContaining(candidates, 150, 150)?.id).toBe(1);
        expect(pickSmallestContaining(candidates, 500, 500)).toBeNull();
    });
});
