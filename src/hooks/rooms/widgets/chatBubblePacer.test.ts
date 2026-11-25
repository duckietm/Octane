import { describe, expect, it } from 'vitest';
import { createChatBubblePacer } from './chatBubblePacer';

const setup = (perFrame = 3) => {
    const shown: number[][] = [];
    const frames: (() => void)[] = [];
    const state = { hidden: false, cancelled: 0 };
    const pacer = createChatBubblePacer<number>({
        show: (lines) => shown.push(lines),
        requestFrame: (callback) => frames.push(callback),
        cancelFrame: () => {
            state.cancelled++;
            frames.length = 0;
        },
        isHidden: () => state.hidden,
        perFrame
    });
    const frame = () => frames.shift()?.();

    return { pacer, shown, frame, frames, state };
};

describe('chat bubble pacing', () => {
    it('shows lines at once while the frame is under its limit', () => {
        const { pacer, shown } = setup();

        pacer.push(1);
        pacer.push(2);

        expect(shown).toEqual([[1], [2]]);
        expect(pacer.waiting).toBe(0);
    });

    it('spreads a burst over the following frames, in arrival order', () => {
        const { pacer, shown, frame } = setup();

        for (let line = 1; line <= 8; line++) pacer.push(line);

        expect(shown).toEqual([[1], [2], [3]]);
        expect(pacer.waiting).toBe(5);

        frame();
        expect(shown.at(-1)).toEqual([4, 5, 6]);

        frame();
        expect(shown.at(-1)).toEqual([7, 8]);
        expect(pacer.waiting).toBe(0);
    });

    it('keeps the order when a line arrives while others wait', () => {
        const { pacer, shown, frame } = setup();

        for (let line = 1; line <= 5; line++) pacer.push(line);
        frame();
        // The frame showed 4 and 5; 6 and 7 still fit in it, 8 waits.
        pacer.push(6);
        pacer.push(7);
        pacer.push(8);

        expect(shown.flat()).toEqual([1, 2, 3, 4, 5, 6]);
        frame();
        expect(shown.flat()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('starts a new count every frame', () => {
        const { pacer, shown, frame } = setup();

        for (let line = 1; line <= 3; line++) pacer.push(line);
        frame();
        for (let line = 4; line <= 6; line++) pacer.push(line);

        expect(shown.flat()).toEqual([1, 2, 3, 4, 5, 6]);
        expect(pacer.waiting).toBe(0);
    });

    it('holds nothing back in a hidden tab, which gets no frames', () => {
        const { pacer, shown, state } = setup();

        for (let line = 1; line <= 5; line++) pacer.push(line);
        state.hidden = true;
        pacer.push(6);

        expect(shown.at(-1)).toEqual([4, 5, 6]);
        expect(pacer.waiting).toBe(0);
    });

    it('drops what is waiting when cleared', () => {
        const { pacer, shown, frame, state } = setup();

        for (let line = 1; line <= 6; line++) pacer.push(line);
        pacer.clear();
        frame();

        expect(shown.flat()).toEqual([1, 2, 3]);
        expect(pacer.waiting).toBe(0);
        expect(state.cancelled).toBe(1);
    });

    it('finds a line that is still waiting', () => {
        const { pacer } = setup();

        for (let line = 1; line <= 5; line++) pacer.push(line);

        expect(pacer.find((line) => line === 5)).toBe(5);
        // Already shown: no longer the pacer's.
        expect(pacer.find((line) => line === 2)).toBeUndefined();
    });

    describe('with a clock', () => {
        const timed = (perFrame: number) => {
            const shown: number[][] = [];
            const frames: (() => void)[] = [];
            const clock = { now: 0 };
            const pacer = createChatBubblePacer<number>({
                show: (lines) => shown.push(lines),
                requestFrame: (callback) => frames.push(callback),
                cancelFrame: () => undefined,
                isHidden: () => false,
                now: () => clock.now,
                perFrame,
                maxPerFrame: 8
            });
            const frame = (afterMs: number) => {
                clock.now += afterMs;
                frames.shift()?.();
            };

            return { pacer, shown, frame };
        };

        it('halves the batches when the frame after a batch ran long', () => {
            const { pacer, shown, frame } = timed(4);

            for (let line = 1; line <= 40; line++) pacer.push(line);
            frame(16);
            expect(shown.at(-1)).toHaveLength(4);

            // Building those four took the frame to 60 ms.
            frame(60);
            expect(pacer.pace).toBe(2);
            expect(shown.at(-1)).toHaveLength(2);

            frame(60);
            expect(pacer.pace).toBe(1);
            frame(60);
            expect(pacer.pace).toBe(1);
        });

        it('grows the batches again while frames are quick', () => {
            const { pacer, shown, frame } = timed(2);

            for (let line = 1; line <= 40; line++) pacer.push(line);
            frame(16);
            frame(10);
            expect(pacer.pace).toBe(3);
            expect(shown.at(-1)).toHaveLength(3);

            for (let step = 0; step < 10; step++) frame(10);
            expect(pacer.pace).toBeLessThanOrEqual(8);
        });

        it('keeps the pace when a frame was neither long nor quick', () => {
            const { pacer, frame } = timed(4);

            for (let line = 1; line <= 40; line++) pacer.push(line);
            frame(16);
            frame(25);
            expect(pacer.pace).toBe(4);
        });

        it('raises the batch for a backlog whatever the pace', () => {
            const { pacer, shown, frame } = timed(1);

            for (let line = 1; line <= 451; line++) pacer.push(line);
            frame(16);

            // 450 waiting over 45 frames: ten a frame, though the pace is one.
            expect(shown.at(-1)).toHaveLength(10);
        });
    });
});
