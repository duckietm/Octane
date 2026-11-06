import { AvatarAction, AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@octane/renderer';
import { useEffect, useState } from 'react';

const RETRY_MS = 500;
const RETRY_MAX = 30;

/** An avatar drawn by the hotel's renderer in one pose (standing or sitting), facing one of the hotel's directions. */
export const useUnoAvatar = (figure: string, gender: string, direction: number, posture: string = AvatarAction.POSTURE_SIT): string | null => {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let disposed = false;
        let retries = 0;
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
            avatar.endActionAppends();

            const image = avatar.processAsImageUrl(AvatarSetType.FULL);
            const placeholder = avatar.isPlaceholder();

            avatar.dispose();

            if (disposed) return;
            if (!image) return retry();

            setUrl(image);

            if (placeholder) retry();
        };

        render(figure);

        return () => {
            disposed = true;
            if (timer) clearTimeout(timer);
        };
    }, [figure, gender, direction, posture]);

    return url;
};
