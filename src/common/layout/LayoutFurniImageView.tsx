import { GetRoomEngine, IGetImageListener, ImageResult, TextureUtils, Vector3d } from '@octane/renderer';
import { CSSProperties, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProductTypeEnum } from '../../api';
import { Base, BaseProps } from '../Base';

interface LayoutFurniImageViewProps extends BaseProps<HTMLDivElement> {
    productType: string;
    productClassId: number;
    direction?: number;
    extraData?: string;
    // Multistate furni state index. -1 (default) leaves the furni at its base
    // look; >= 0 drives the visualization to that interaction state exactly the
    // way the room does (ObjectDataUpdateMessage), so a state change here matches
    // the in-game appearance instead of only tweaking the extras string.
    state?: number;
    scale?: number;
}

export const LayoutFurniImageView: FC<LayoutFurniImageViewProps> = (props) => {
    const { productType = 's', productClassId = -1, direction = 2, extraData = '', state = -1, scale = 1, style = {}, ...rest } = props;
    const [imageElement, setImageElement] = useState<HTMLImageElement>(null);
    const isMounted = useRef(true);
    const requestIdRef = useRef(0);

    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    const updateImage = useCallback(async (texture: any, requestId: number) => {
        if (!texture) return;

        const image = await TextureUtils.generateImage(texture);

        if (image && isMounted.current && requestIdRef.current === requestId) setImageElement(image);
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
        const requestId = ++requestIdRef.current;

        setImageElement(null);

        let imageResult: ImageResult = null;

        const listener: IGetImageListener = {
            imageReady: (result) => updateImage(result?.data, requestId),
            imageFailed: () => updateImage(null, requestId)
        };

        switch (productType.toLocaleLowerCase()) {
            case ProductTypeEnum.FLOOR:
                imageResult = GetRoomEngine().getFurnitureFloorImage(productClassId, new Vector3d(direction), 64, listener, 0, extraData, state);
                break;
            case ProductTypeEnum.WALL:
                imageResult = GetRoomEngine().getFurnitureWallImage(productClassId, new Vector3d(direction), 64, listener, 0, extraData, state);
                break;
        }

        if (imageResult?.data) updateImage(imageResult.data, requestId);
    }, [productType, productClassId, direction, extraData, state, updateImage]);

    return <Base classNames={['furni-image']} style={getStyle} {...rest} />;
};
