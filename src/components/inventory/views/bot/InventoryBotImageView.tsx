import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';

export const InventoryBotImageView: FC<{ figure: string; gender: string; preview?: boolean }> = ({ figure, gender, preview = false }) => {
    const [imageUrl, setImageUrl] = useState<string>(null);

    useEffect(() => {
        let disposed = false;

        const render = () => {
            if (disposed) return;

            const avatar = GetAvatarRenderManager().createAvatarImage(figure, AvatarScaleType.LARGE, gender, {
                resetFigure: render,
                dispose: null,
                disposed: false
            });

            avatar.setDirection(AvatarSetType.FULL, preview ? 4 : 3);
            setImageUrl(avatar.processAsCroppedImageUrl(preview ? AvatarSetType.FULL : AvatarSetType.HEAD, true));
            avatar.dispose();
        };

        render();

        return () => {
            disposed = true;
        };
    }, [figure, gender, preview]);

    return imageUrl ? <img src={imageUrl} alt="" draggable={false} /> : null;
};
