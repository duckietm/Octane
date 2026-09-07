import { GetRoomEngine, TextureUtils, Vector3d } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from 'react';
import { Base, BaseProps } from '../Base';

interface LayoutRoomObjectImageViewProps extends BaseProps<HTMLDivElement> {
    roomId: number;
    objectId: number;
    category: number;
    direction?: number;
    scale?: number;
}

export const LayoutRoomObjectImageView: FC<LayoutRoomObjectImageViewProps> = (props) => {
    const { roomId = -1, objectId = 1, category = -1, direction = 2, scale = 1, style = {}, ...rest } = props;
    const [imageElement, setImageElement] = useState<HTMLImageElement>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    const getStyle = useMemo(() => {
        let newStyle: CSSProperties = {};

        if (imageElement?.src?.length) {
            newStyle.backgroundImage = `url('${imageElement.src}')`;
            newStyle.width = imageElement.width;
            newStyle.height = imageElement.height;
        }

        if (scale !== 1) {
            newStyle.transform = `scale(${scale})`;

            if (!(scale % 1)) newStyle.imageRendering = 'pixelated';
        }

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [imageElement, scale, style]);

    useEffect(() => {
        const imageResult = GetRoomEngine().getRoomObjectImage(roomId, objectId, category, new Vector3d(direction * 45), 64, {
            imageReady: async (result) => {
                const img = await TextureUtils.generateImage(result.data);

                if (img && isMounted.current) setImageElement(img);
            },
            imageFailed: () => {
                // no-op
            }
        });

        if (!imageResult) return;

        (async () => {
            const img = await TextureUtils.generateImage(imageResult.data);

            if (img && isMounted.current) setImageElement(img);
        })();
    }, [roomId, objectId, category, direction, scale]);

    if (!imageElement) return null;

    return <Base classNames={['furni-image']} style={getStyle} {...rest} />;
};
