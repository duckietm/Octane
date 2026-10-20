import { GuideSessionIsTypingMessageComposer } from '@octane/renderer';
import { useCallback, useEffect, useRef } from 'react';
import { SendMessageComposer } from '../../api';

/** AIR GuideSessionController const_1250: the typing state is sampled every 3 seconds. */
export const GUIDE_TYPING_POLL_MS = 3000;

/**
 * AIR GuideSessionController: while a session is ongoing, every 3 s it compares the input length
 * with the last sample. "Typing" means the length changed since then, and the state is sent
 * (GuideSessionIsTypingMessageComposer) only when it flips. Sending a message restarts the sampling.
 *
 * Returns `restart`, to call after a message has been sent.
 */
export const useGuideSessionTyping = (messageLength: number, active = true) => {
    const lengthRef = useRef(messageLength);
    const lastSampleRef = useRef(messageLength);
    const isTypingRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        lengthRef.current = messageLength;
    }, [messageLength]);

    const stop = useCallback(() => {
        if (timerRef.current !== null) clearInterval(timerRef.current);

        timerRef.current = null;
    }, []);

    const start = useCallback(() => {
        stop();

        lastSampleRef.current = lengthRef.current;
        timerRef.current = setInterval(() => {
            const length = lengthRef.current;
            const isTyping = lastSampleRef.current !== length;

            if (isTypingRef.current !== isTyping) {
                SendMessageComposer(new GuideSessionIsTypingMessageComposer(isTyping));
                isTypingRef.current = isTyping;
            }

            lastSampleRef.current = length;
        }, GUIDE_TYPING_POLL_MS);
    }, [stop]);

    useEffect(() => {
        if (!active) return;

        start();

        return stop;
    }, [active, start, stop]);

    return { restart: start };
};
