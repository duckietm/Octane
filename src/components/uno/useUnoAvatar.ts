import { AvatarAction, AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@octane/renderer';
import { useEffect, useState } from 'react';

const RETRY_MS = 500;
const RETRY_MAX = 30;

/** An avatar drawn by the hotel's renderer in one pose (standing or sitting), facing one of the hotel's directions. */
export const useUnoAvatar = (figure: string, gender: string, direction: number, posture: string = AvatarAction.POSTURE_SIT, sign = -1, effect = 0): string | null => {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let disposed = false;
        let retries = 0;
        let effectDraws = 0;
        let timer: ReturnType<typeof setTimeout> = null;

        const render = (renderFigure: string) => {
            if (disposed || !renderFigure) return;

            const retry = () => {
                if (timer || retries >= RETRY_MAX) return;

                retries++;
                timer = setTimeout(() => {
                    timer = null;
                    render(renderFigure);
                }, RETRY_MS);
            };

            let avatar = null;

            try {
                avatar = GetAvatarRenderManager()?.createAvatarImage(renderFigure, AvatarScaleType.LARGE, gender, {
                    resetFigure: (updated: string) => render(updated),
                    dispose: null,
                    disposed: false
                });
            } catch {
                avatar = null;
            }

            if (!avatar) return retry();

            avatar.initActionAppends();
            avatar.setDirection(AvatarSetType.FULL, direction);
            avatar.appendAction(AvatarAction.POSTURE, posture);
            if (sign >= 0) avatar.appendAction(AvatarAction.SIGN, sign);
            if (effect > 0) avatar.appendAction(AvatarAction.EFFECT, effect);
            avatar.endActionAppends();

            let image: string = null;
            let placeholder = false;

            try {
                image = avatar.processAsImageUrl(AvatarSetType.FULL);
                placeholder = avatar.isPlaceholder();
            } catch {
                // A pose the renderer cannot draw for this look: nothing rather than a crash.
                image = null;
                retries = RETRY_MAX;
            }

            avatar.dispose();

            if (disposed) return;
            if (!image) return retry();

            setUrl(image);

            // An effect is downloaded when first asked for: drawn again until it is in.
            if (placeholder || (effect > 0 && effectDraws++ < 4)) retry();
        };

        render(figure);

        return () => {
            disposed = true;
            if (timer) clearTimeout(timer);
        };
    }, [figure, gender, direction, posture, sign, effect]);

    return url;
};
