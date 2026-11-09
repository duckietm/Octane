import { RefObject, useEffect, useState } from 'react';
import { backgroundImageUrl, BackgroundTone, gradientTone, toneForPixels } from '../../api/utils/BackgroundTone';

const TONE_CACHE = new Map<string, BackgroundTone>();
const SAMPLE_SIZE = 48;

/**
 * Whether the card background painted on `ref` is light or dark, so the copy on top of it
 * can switch colour. The image url comes from the element's computed style, is drawn once
 * onto a small canvas and its mean luminance is cached per url. Without a background, or
 * until the image is measured, the tone is `light` (the default dark copy).
 */
export const useCardBackgroundTone = (ref: RefObject<HTMLElement>, cardBackgroundId: number): BackgroundTone => {
    const [tone, setTone] = useState<BackgroundTone>('light');

    useEffect(() => {
        if (!cardBackgroundId || !ref.current) {
            setTone('light');

            return;
        }

        const computed = window.getComputedStyle(ref.current);
        const backgroundImage = computed.backgroundImage;
        const gradient = gradientTone(backgroundImage, computed.backgroundColor);

        if (gradient !== null) {
            setTone(gradient);

            return;
        }

        const url = backgroundImageUrl(backgroundImage);

        if (!url) {
            setTone('light');

            return;
        }

        const cached = TONE_CACHE.get(url);

        if (cached) {
            setTone(cached);

            return;
        }

        let cancelled = false;
        const image = new Image();

        image.onload = () => {
            if (cancelled) return;

            let measured: BackgroundTone = 'light';

            try {
                const canvas = document.createElement('canvas');

                canvas.width = SAMPLE_SIZE;
                canvas.height = SAMPLE_SIZE;

                const context = canvas.getContext('2d');

                if (context) {
                    // The tile repeats, so a scaled-down copy is a fair sample of the whole box.
                    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
                    measured = toneForPixels(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
                }
            } catch {
                measured = 'light';
            }

            TONE_CACHE.set(url, measured);
            setTone(measured);
        };

        image.onerror = () => {
            if (!cancelled) setTone('light');
        };

        image.src = url;

        return () => {
            cancelled = true;
        };
    }, [ref, cardBackgroundId]);

    return tone;
};
