import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/** AIR RecyclerEngineAnimator: the dial runs between -88 and 88 degrees and ends a run on the far right. */
const MAX_ANGLE = 88;
const ANGLE_BUFFER = 5;
const FINISH_ANGLE = 82;
const LATE_ANGLE = 68;
const MIN_TIME_ACTIVE = 3000;
const RESET_TIME = 250;
const SHAKE_TIMEOUT = 50;
const SHAKE_PIXELS = 3;
const TICK_MS = 16;
const FIRST_BIAS = 0.2;
const BASE_BIAS = 0.35;
const BIAS_PER_MS = 0.00008;

const rand = (min: number, max: number) => Math.trunc(min + Math.random() * (max - min));

export interface RecyclerEngineFrame {
    angle: number;
    shakeX: number;
    shakeY: number;
}

export interface RecyclerEngine {
    frame: RecyclerEngineFrame;
    /** A run is on: started and neither finished, stopped nor swinging back. */
    busy: boolean;
    start: () => void;
    /** Stops where it is (the abort link); `reset` then swings the needle back. */
    stop: () => void;
    reset: () => void;
}

const REST: RecyclerEngineFrame = { angle: 0, shakeX: 0, shakeY: 0 };

/**
 * The Furnimatic's needle and machine shake (AIR RecyclerEngineAnimator). A run steps the needle in jumps of 20-55
 * degrees every 200-400 ms, more and more towards the right, and shakes the machine 3 px every 50 ms; it lasts at least
 * 3 s, ends with the needle on the far right and then calls `onFinish`. `reset` swings the needle back in 250 ms.
 */
export const useRecyclerEngineAnimation = (onFinish: () => void): RecyclerEngine => {
    const [frame, setFrame] = useState<RecyclerEngineFrame>(REST);
    const [busy, setBusy] = useState(false);
    const onFinishRef = useRef(onFinish);
    const timerRef = useRef<number | null>(null);
    const angleRef = useRef(0);

    useLayoutEffect(() => {
        onFinishRef.current = onFinish;
    });

    const stopTimer = useCallback(() => {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);

        timerRef.current = null;
    }, []);

    useEffect(() => stopTimer, [stopTimer]);

    const show = useCallback((angle: number, shakeX = 0, shakeY = 0) => {
        angleRef.current = angle;
        setFrame({ angle, shakeX, shakeY });
    }, []);

    const start = useCallback(() => {
        stopTimer();

        const startTime = Date.now();
        let from = 0;
        let to = 0;
        let stepBegin = startTime;
        let stepDuration = 0;
        let lastShake = 0;
        let shake = { x: 0, y: 0 };

        const nextStep = (toTheEnd: boolean, first: boolean) => {
            from = angleRef.current;
            stepBegin = Date.now();

            if (toTheEnd) {
                to = MAX_ANGLE;
            } else {
                const getBackwards = () => {
                    if (from <= -MAX_ANGLE + ANGLE_BUFFER) return false;
                    if (from >= MAX_ANGLE - ANGLE_BUFFER) return true;

                    return Math.random() > (first ? FIRST_BIAS : BASE_BIAS + (stepBegin - startTime) * BIAS_PER_MS);
                };

                to = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, from + (getBackwards() ? -1 : 1) * rand(20, 55)));
            }

            stepDuration = rand(200, 400);
        };

        show(0);
        nextStep(false, true);
        setBusy(true);

        timerRef.current = window.setInterval(() => {
            const now = Date.now();
            const elapsed = now - stepBegin;
            const angle = Math.trunc((to - from) * Math.max(0, Math.min(1, elapsed / stepDuration)) + from);

            if (now > lastShake + SHAKE_TIMEOUT) {
                lastShake = now;
                shake = { x: rand(-SHAKE_PIXELS, SHAKE_PIXELS), y: rand(-SHAKE_PIXELS, SHAKE_PIXELS) };
            }

            show(angle, shake.x, shake.y);

            if (elapsed < stepDuration) return;

            if (angle >= FINISH_ANGLE && now - startTime > MIN_TIME_ACTIVE) {
                stopTimer();
                show(angle);
                setBusy(false);
                onFinishRef.current();

                return;
            }

            nextStep(angle >= LATE_ANGLE && now - startTime > MIN_TIME_ACTIVE - 300, false);
        }, TICK_MS);
    }, [show, stopTimer]);

    const stop = useCallback(() => {
        stopTimer();
        show(angleRef.current);
        setBusy(false);
    }, [show, stopTimer]);

    const reset = useCallback(() => {
        stopTimer();
        setBusy(false);

        const from = angleRef.current % 360;
        const begin = Date.now();

        show(from);

        timerRef.current = window.setInterval(() => {
            const elapsed = Date.now() - begin;

            show(Math.trunc(from * (1 - Math.max(0, Math.min(1, elapsed / RESET_TIME)))) || 0);

            if (elapsed >= RESET_TIME) stopTimer();
        }, TICK_MS);
    }, [show, stopTimer]);

    return useMemo(() => ({ frame, busy, start, stop, reset }), [frame, busy, start, stop, reset]);
};
