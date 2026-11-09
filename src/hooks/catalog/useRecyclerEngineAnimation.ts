import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** AIR RecyclerEngineAnimator: the dial runs between -88 and 88 degrees and ends a run on the far right. */
const MAX_ANGLE = 88;
const FINISH_ANGLE = 82;
const LATE_ANGLE = 68;
const MIN_TIME_ACTIVE = 3000;
const RESET_TIME = 250;
const SHAKE_TIMEOUT = 50;
const SHAKE_PIXELS = 3;
const TICK_MS = 16;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export interface RecyclerEngineFrame {
    angle: number;
    shakeX: number;
    shakeY: number;
}

const REST: RecyclerEngineFrame = { angle: 0, shakeX: 0, shakeY: 0 };

/**
 * The Furnimatic's needle and machine shake while a recycle runs (AIR RecyclerEngineAnimator): the needle steps
 * towards the right in random jumps of 20-55 degrees every 200-400 ms, the machine shakes 3 px every 50 ms, and a run
 * lasts at least 3 s and until `active` is false; it then ends with the needle right and swings back to rest.
 */
export const useRecyclerEngineAnimation = (active: boolean): RecyclerEngineFrame => {
    const [frame, setFrame] = useState<RecyclerEngineFrame>(REST);
    const activeRef = useRef(active);
    const runningRef = useRef(false);
    const timerRef = useRef<number | null>(null);

    useLayoutEffect(() => {
        activeRef.current = active;
    }, [active]);

    // The run outlives a change of `active` (it ends on its own), but not the page.
    useEffect(
        () => () => {
            if (timerRef.current !== null) window.clearInterval(timerRef.current);
            timerRef.current = null;
            runningRef.current = false;
        },
        []
    );

    useEffect(() => {
        if (!active || runningRef.current) return;

        runningRef.current = true;

        const startTime = Date.now();
        let from = 0;
        let to = rand(20, 55);
        let stepBegin = startTime;
        let stepDuration = rand(200, 400);
        let resetting = false;
        let lastShake = 0;
        let shake = { x: 0, y: 0 };

        const timer = window.setInterval(() => {
            const now = Date.now();
            const progress = Math.max(0, Math.min(1, (now - stepBegin) / stepDuration));
            const angle = from + (to - from) * progress;

            if (!resetting && now > lastShake + SHAKE_TIMEOUT) {
                lastShake = now;
                shake = { x: Math.round(rand(-SHAKE_PIXELS, SHAKE_PIXELS)), y: Math.round(rand(-SHAKE_PIXELS, SHAKE_PIXELS)) };
            }

            setFrame({ angle, shakeX: resetting ? 0 : shake.x, shakeY: resetting ? 0 : shake.y });

            if (progress < 1) return;

            if (resetting) {
                window.clearInterval(timer);
                timerRef.current = null;
                runningRef.current = false;
                setFrame(REST);

                return;
            }

            const elapsed = now - startTime;

            if (angle >= FINISH_ANGLE && elapsed > MIN_TIME_ACTIVE && !activeRef.current) {
                resetting = true;
                from = angle;
                to = 0;
                stepBegin = now;
                stepDuration = RESET_TIME;

                return;
            }

            from = angle;
            stepBegin = now;

            if (angle >= LATE_ANGLE && elapsed > MIN_TIME_ACTIVE - 300 && !activeRef.current) {
                to = MAX_ANGLE;
                stepDuration = rand(200, 400);

                return;
            }

            // Mostly forward, sometimes back, as the AIR needle: biased towards the right over the run.
            const forward = Math.random() < 0.35 + Math.min(1, elapsed / MIN_TIME_ACTIVE) * 0.4;
            const step = rand(20, 55) * (forward ? 1 : -1);

            to = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle + step));
            stepDuration = rand(200, 400);
        }, TICK_MS);

        timerRef.current = timer;

        return undefined;
    }, [active]);

    return frame;
};
