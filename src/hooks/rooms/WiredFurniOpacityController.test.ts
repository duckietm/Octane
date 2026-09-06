import { RoomObjectCategory, RoomObjectVariable } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import {
    clampWiredOpacity,
    WiredFurniOpacityController,
    WiredOpacityFrameScheduler,
    WiredOpacityObject,
    WiredOpacityObjectModel,
    WiredOpacityObjectSource,
    wiredOpacityEasing
} from './WiredFurniOpacityController';

class TestModel implements WiredOpacityObjectModel
{
    readonly values = new Map<string, unknown>();

    getValue<T>(key: string): T
    {
        return this.values.get(key) as T;
    }

    setValue<T>(key: string, value: T): void
    {
        this.values.set(key, value);
    }
}

class TestObjects implements WiredOpacityObjectSource
{
    readonly values = new Map<string, WiredOpacityObject>();

    key(roomId: number, itemId: number, category: number): string
    {
        return `${roomId}:${category}:${itemId}`;
    }

    add(roomId: number, itemId: number, category: number): TestModel
    {
        const model = new TestModel();
        this.values.set(this.key(roomId, itemId, category), { model });
        return model;
    }

    getObject(roomId: number, itemId: number, category: number): WiredOpacityObject
    {
        return this.values.get(this.key(roomId, itemId, category));
    }
}

class TestFrames implements WiredOpacityFrameScheduler
{
    currentTime = 1000;
    nextHandle = 1;
    requested = new Map<number, (time: number) => void>();
    cancelled: number[] = [];

    now(): number
    {
        return this.currentTime;
    }

    request(callback: (time: number) => void): number
    {
        const handle = this.nextHandle++;
        this.requested.set(handle, callback);
        return handle;
    }

    cancel(handle: number): void
    {
        this.cancelled.push(handle);
        this.requested.delete(handle);
    }

    run(time: number): void
    {
        const entry = this.requested.entries().next().value as [ number, (time: number) => void ];
        expect(entry).toBeTruthy();
        this.requested.delete(entry[0]);
        this.currentTime = time;
        entry[1](time);
    }
}

const update = (itemId: number, opacity: number, durationMs = 0, easing = 0, wallItem = false) => ({
    itemId,
    wallItem,
    opacity,
    clickThrough: true,
    easing,
    durationMs
});

describe('WiredFurniOpacityController', () =>
{
    it('owns one animation frame for every active object and lands exactly on target', () =>
    {
        const objects = new TestObjects();
        const frames = new TestFrames();
        const first = objects.add(7, 1, RoomObjectCategory.FLOOR);
        const second = objects.add(7, 2, RoomObjectCategory.FLOOR);
        const controller = new WiredFurniOpacityController(objects, frames);
        controller.setRoom(7);

        controller.apply(7, [ update(1, 20, 1000, 1), update(2, 60, 1000, 1) ]);

        expect(frames.requested.size).toBe(1);
        expect(controller.pendingAnimationCount()).toBe(2);
        frames.run(1500);
        expect(first.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_OPACITY)).toBeCloseTo(0.6);
        expect(second.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_OPACITY)).toBeCloseTo(0.8);
        expect(frames.requested.size).toBe(1);
        frames.run(2000);
        expect(first.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_OPACITY)).toBe(0.2);
        expect(second.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_OPACITY)).toBe(0.6);
        expect(controller.pendingAnimationCount()).toBe(0);
        expect(frames.requested.size).toBe(0);
    });

    it('replacement starts from the rendered value rather than the stale original target', () =>
    {
        const objects = new TestObjects();
        const frames = new TestFrames();
        const model = objects.add(8, 3, RoomObjectCategory.FLOOR);
        const controller = new WiredFurniOpacityController(objects, frames);
        controller.setRoom(8);
        controller.apply(8, [ update(3, 0, 1000, 1) ]);
        frames.run(1500);
        expect(model.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_OPACITY)).toBeCloseTo(0.5);

        controller.apply(8, [ update(3, 100, 1000, 1) ]);
        frames.run(2000);

        expect(model.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_OPACITY)).toBeCloseTo(0.75);
        expect(controller.pendingAnimationCount()).toBe(1);
    });

    it('retains a missing-object target and applies final state when the object appears', () =>
    {
        const objects = new TestObjects();
        const frames = new TestFrames();
        const controller = new WiredFurniOpacityController(objects, frames);
        controller.setRoom(9);
        controller.apply(9, [ update(4, 35, 500, 2, true) ]);

        expect(frames.requested.size).toBe(0);
        const model = objects.add(9, 4, RoomObjectCategory.WALL);
        controller.objectAdded(9, 4, RoomObjectCategory.WALL);

        expect(model.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_OPACITY)).toBe(0.35);
        expect(model.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_CLICK_THROUGH)).toBe(1);
    });

    it('cancels and restores room state on removal, room switch and disposal', () =>
    {
        const objects = new TestObjects();
        const frames = new TestFrames();
        const model = objects.add(10, 5, RoomObjectCategory.FLOOR);
        const controller = new WiredFurniOpacityController(objects, frames);
        controller.setRoom(10);
        controller.apply(10, [ update(5, 10, 1000, 1) ]);
        controller.objectRemoved(10, 5, RoomObjectCategory.FLOOR);
        expect(controller.pendingAnimationCount()).toBe(0);
        expect(frames.cancelled).toHaveLength(1);

        controller.apply(10, [ update(5, 25) ]);
        controller.setRoom(11);
        expect(model.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_OPACITY)).toBe(1);
        expect(model.getValue<number>(RoomObjectVariable.FURNITURE_WIRED_CLICK_THROUGH)).toBe(0);
        controller.dispose();
    });

    it('clamps inputs and freezes the documented easing curves', () =>
    {
        expect(clampWiredOpacity(Number.NaN)).toBe(100);
        expect(clampWiredOpacity(-1)).toBe(0);
        expect(clampWiredOpacity(101)).toBe(100);
        expect(wiredOpacityEasing(0.5, 1)).toBe(0.5);
        expect(wiredOpacityEasing(0.5, 2)).toBe(0.125);
        expect(wiredOpacityEasing(0.5, 3)).toBe(0.875);
        expect(wiredOpacityEasing(0.5, 4)).toBe(0.5);
    });
});
