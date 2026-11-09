import { describe, expect, it } from 'vitest';
import {
    DEFAULT_BUBBLE_STACK_OVERLAP,
    getBorderImageOutsetEdges,
    getBubbleStackOverflowBottom,
    getPointerChatIds
} from './chatBubbleMetrics';

describe('getBorderImageOutsetEdges', () => {
    it('reads the top and bottom edges of a four value outset', () => {
        expect(getBorderImageOutsetEdges('2px 0px 3px 0px')).toEqual({ top: 2, bottom: 3 });
    });

    it('mirrors the top edge onto the bottom for one and two value outsets', () => {
        expect(getBorderImageOutsetEdges('4px')).toEqual({ top: 4, bottom: 4 });
        expect(getBorderImageOutsetEdges('4px 9px')).toEqual({ top: 4, bottom: 4 });
    });

    it('reads the third value as the bottom edge of a three value outset', () => {
        expect(getBorderImageOutsetEdges('7px 7px 1px')).toEqual({ top: 7, bottom: 1 });
    });

    it('treats a unitless outset as zero because the bubble border width is zero', () => {
        expect(getBorderImageOutsetEdges('2 0 0 0')).toEqual({ top: 0, bottom: 0 });
    });

    it('falls back to no offset for an empty or missing value', () => {
        expect(getBorderImageOutsetEdges('')).toEqual({ top: 0, bottom: 0 });
        expect(getBorderImageOutsetEdges(undefined as unknown as string)).toEqual({ top: 0, bottom: 0 });
    });
});

describe('getBubbleStackOverflowBottom', () => {
    it('lets the pointer tail tuck behind the bubble below it', () => {
        expect(getBubbleStackOverflowBottom(5, 4)).toBe(1);
        expect(getBubbleStackOverflowBottom(7, 4)).toBe(3);
    });

    it('never asks for clearance the artwork does not need', () => {
        expect(getBubbleStackOverflowBottom(3, 4)).toBe(0);
        expect(getBubbleStackOverflowBottom(0, 4)).toBe(0);
    });

    it('keeps the whole tail clear when the overlap is turned off', () => {
        expect(getBubbleStackOverflowBottom(5, 0)).toBe(5);
    });

    it('falls back to the default overlap when the configured value is not a number', () => {
        expect(getBubbleStackOverflowBottom(5, Number.NaN)).toBe(5 - DEFAULT_BUBBLE_STACK_OVERLAP);
    });
});

describe('getPointerChatIds', () => {
    it('keeps the tail on the newest bubble of a speaker only', () => {
        const pointerIds = getPointerChatIds([
            { id: 1, senderId: 10 },
            { id: 2, senderId: 10 },
            { id: 3, senderId: 10 }
        ]);

        expect([...pointerIds]).toEqual([3]);
    });

    it('gives every speaker in the room their own tail', () => {
        const pointerIds = getPointerChatIds([
            { id: 1, senderId: 10 },
            { id: 2, senderId: 20 },
            { id: 3, senderId: 10 },
            { id: 4, senderId: 20 }
        ]);

        expect([...pointerIds].sort((first, second) => first - second)).toEqual([3, 4]);
    });

    it('picks the newest bubble by id rather than by list position', () => {
        const pointerIds = getPointerChatIds([
            { id: 7, senderId: 10 },
            { id: 4, senderId: 10 }
        ]);

        expect([...pointerIds]).toEqual([7]);
    });

    it('leaves the tail on every senderless bubble', () => {
        const pointerIds = getPointerChatIds([
            { id: 1, senderId: -1 },
            { id: 2, senderId: -1 }
        ]);

        expect([...pointerIds].sort((first, second) => first - second)).toEqual([1, 2]);
    });

    it('returns nothing for an empty room', () => {
        expect(getPointerChatIds([]).size).toBe(0);
    });
});
