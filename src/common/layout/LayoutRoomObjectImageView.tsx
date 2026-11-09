import { GetRoomEngine, IImageResult, Vector3d } from '@octane/renderer';
import { CSSProperties, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Base, BaseProps } from '../Base';
import { PIXEL_ART_RENDERING } from './PixelArtRendering';

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
    const requestIdRef = useRef(0);

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

            if (!(scale % 1)) newStyle.imageRendering = PIXEL_ART_RENDERING;
        }

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [imageElement, scale, style]);

    // A late image for a previous roomId/objectId/direction must not overwrite the
    // current one: every request carries its id and only the latest one may commit.
    const updateImage = useCallback(async (result: IImageResult | null, requestId: number) => {
        if (!result) return;

        const img = await result.getImage();

        if (img && isMounted.current && requestIdRef.current === requestId) setImageElement(img);
    }, []);

    useEffect(() => {
        const requestId = ++requestIdRef.current;

        const imageResult = GetRoomEngine().getRoomObjectImage(roomId, objectId, category, new Vector3d(direction * 45), 64, {
            imageReady: (result) => updateImage(result, requestId),
            imageFailed: () => {
                // no-op
            }
        });

        if (!imageResult) return;

        updateImage(imageResult, requestId);
    }, [roomId, objectId, category, direction, scale, updateImage]);

    if (!imageElement) return null;

    return <Base classNames={['furni-image']} style={getStyle} {...rest} />;
};
