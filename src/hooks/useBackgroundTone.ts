import { RefObject, useEffect, useState } from 'react';
import { BackgroundTone, measureBackground, Rgb, toneOf } from '../api';

/**
 * Whether the background a player chose for an element is dark or light, measured once the element is
 * painted and again whenever `key` changes (the chosen background). Null while there is nothing to
 * measure (`key` empty) or before the first measure, so the element keeps its own text colours.
 */
export const useBackgroundTone = (ref: RefObject<HTMLElement | null>, key: string, fallback: Rgb): BackgroundTone | null => {
    const [tone, setTone] = useState<BackgroundTone | null>(null);

    useEffect(() => {
        const element = ref.current;

        setTone(null);

        if (!key || !element) return;

        let cancelled = false;

        measureBackground(element, fallback).then((color) => {
            if (!cancelled) setTone(toneOf(color));
        });

        return () => {
            cancelled = true;
        };
    }, [key]);

    return tone;
};
