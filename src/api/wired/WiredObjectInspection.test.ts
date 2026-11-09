import { describe, expect, it } from 'vitest';
import {
    canHighlightWiredBoxesFor,
    getWiredObjectInspectionRequest,
    getWiredObjectInspectionValues,
    isWiredObjectInspectionFor,
    toWiredInspectionAssignments,
    WIRED_INSPECTION_OBJECT_TYPE_FURNI,
    WIRED_INSPECTION_OBJECT_TYPE_GLOBAL,
    WIRED_INSPECTION_OBJECT_TYPE_USER,
    WiredObjectInspectionData
} from './WiredObjectInspection';

const furniData = (objectId: number, values: Record<string, number> = {}, configuredInWireds: number[] = []): WiredObjectInspectionData => ({
    type: WIRED_INSPECTION_OBJECT_TYPE_FURNI,
    objectId,
    userIndex: 0,
    values: new Map(Object.entries(values)),
    configuredInWireds
});

describe('WiredObjectInspection', () => {
    describe('getWiredObjectInspectionRequest', () => {
        it('asks for the selected furni by item id and the selected user by room index', () => {
            expect(getWiredObjectInspectionRequest('furni', { objectId: 77 }, { roomIndex: 3 })).toEqual({ type: 0, objectId: 77 });
            expect(getWiredObjectInspectionRequest('user', { objectId: 77 }, { roomIndex: 3 })).toEqual({ type: 1, objectId: 3 });
        });

        it('asks for the room as type -10 with object 0, selection or not', () => {
            expect(getWiredObjectInspectionRequest('global', null, null)).toEqual({ type: WIRED_INSPECTION_OBJECT_TYPE_GLOBAL, objectId: 0 });
        });

        it('asks nothing while the furni or user type has no selection', () => {
            expect(getWiredObjectInspectionRequest('furni', null, { roomIndex: 3 })).toBeNull();
            expect(getWiredObjectInspectionRequest('user', { objectId: 77 }, null)).toBeNull();
        });
    });

    describe('isWiredObjectInspectionFor', () => {
        it('keeps a reply only for the inspected object', () => {
            expect(isWiredObjectInspectionFor(furniData(77), { type: 0, objectId: 77 })).toBe(true);
            expect(isWiredObjectInspectionFor(furniData(78), { type: 0, objectId: 77 })).toBe(false);
            expect(isWiredObjectInspectionFor(furniData(77), { type: 1, objectId: 77 })).toBe(false);
            expect(isWiredObjectInspectionFor(null, { type: 0, objectId: 77 })).toBe(false);
            expect(isWiredObjectInspectionFor(furniData(77), null)).toBe(false);
        });

        it('matches a user reply on its room index and a room reply on its type', () => {
            const user: WiredObjectInspectionData = { type: WIRED_INSPECTION_OBJECT_TYPE_USER, objectId: 0, userIndex: 5, values: new Map(), configuredInWireds: [] };
            const room: WiredObjectInspectionData = { type: WIRED_INSPECTION_OBJECT_TYPE_GLOBAL, objectId: 0, userIndex: 0, values: new Map(), configuredInWireds: [] };

            expect(isWiredObjectInspectionFor(user, { type: 1, objectId: 5 })).toBe(true);
            expect(isWiredObjectInspectionFor(user, { type: 1, objectId: 6 })).toBe(false);
            expect(isWiredObjectInspectionFor(room, { type: -10, objectId: 0 })).toBe(true);
        });
    });

    describe('getWiredObjectInspectionValues', () => {
        it('keys the values of one target by their definition box id and skips the rest', () => {
            const data = furniData(77, { 'furni:12': 5, 'furni:30': -2, 'user:12': 9, 'room:4': 1, 'furni:abc': 3, '@position_x': 4 });

            expect([...getWiredObjectInspectionValues(data, 'furni')]).toEqual([
                [12, 5],
                [30, -2]
            ]);
            expect([...getWiredObjectInspectionValues(data, 'user')]).toEqual([[12, 9]]);
            expect([...getWiredObjectInspectionValues(data, 'room')]).toEqual([[4, 1]]);
            expect(getWiredObjectInspectionValues(null, 'furni').size).toBe(0);
        });

        it('turns values into held assignments for the table and its give/remove buttons', () => {
            expect(toWiredInspectionAssignments(new Map([[12, 5]]))).toEqual([{ variableItemId: 12, value: 5, hasValue: true, createdAt: 0, updatedAt: 0 }]);
        });
    });

    describe('canHighlightWiredBoxesFor', () => {
        it('needs a furni that at least one wired box picks', () => {
            expect(canHighlightWiredBoxesFor(furniData(77, {}, [501, 502]))).toBe(true);
            expect(canHighlightWiredBoxesFor(furniData(77))).toBe(false);
            expect(canHighlightWiredBoxesFor({ ...furniData(77, {}, [501]), type: WIRED_INSPECTION_OBJECT_TYPE_USER })).toBe(false);
            expect(canHighlightWiredBoxesFor(null)).toBe(false);
        });
    });
});
