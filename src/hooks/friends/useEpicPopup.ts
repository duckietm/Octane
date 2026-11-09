import { EpicPopupMessageEvent, GetConfiguration } from '@octane/renderer';
import { useCallback, useState } from 'react';
import { useMessageEvent } from '../events';

/** The image URL of an EpicPopupMessageEvent: `${image.library.url}` and other keys resolved, blank when unusable. */
export const resolveEpicPopupImage = (imageUri: string): string => {
    const raw = (imageUri ?? '').trim();

    if (!raw) return '';

    let resolved = raw;

    try {
        resolved = GetConfiguration().interpolate(raw) || raw;
    } catch {
        resolved = raw;
    }

    return resolved.includes('${') ? '' : resolved;
};

/**
 * AIR `HabboEpicPopupView.onEpicPopupMessageEvent`: every popup replaces the one on screen (`showPopup` disposes
 * the active frame first); the close button and the header close dispose it.
 */
export const useEpicPopup = () => {
    const [imageUrl, setImageUrl] = useState<string>(null);

    useMessageEvent<EpicPopupMessageEvent>(EpicPopupMessageEvent, (event) => {
        const image = resolveEpicPopupImage(event.getParser()?.imageUri);

        if (image) setImageUrl(image);
    });

    const close = useCallback(() => setImageUrl(null), []);

    return { imageUrl, close };
};
