import { GetRoomEngine, IGetImageListener, IImageResult, ImageResult, MapDataType, Vector3d } from '@octane/renderer';
import { CSSProperties, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProductTypeEnum } from '../../api';
import { Base, BaseProps } from '../Base';
import { PIXEL_ART_RENDERING } from './PixelArtRendering';

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
    // Colour (0xRRGGBB) of a recolourable furni (*_recolorable); -1 (default) draws it untinted.
    recolor?: number;
}

const recolorData = (recolor: number, state: number): MapDataType =>
{
    if (recolor < 0) return null;

    const data = new MapDataType();

    data.setValue('state', String(Math.max(state, 0)));
    data.setValue('r', String((recolor >> 16) & 0xff));
    data.setValue('g', String((recolor >> 8) & 0xff));
    data.setValue('b', String(recolor & 0xff));

    return data;
};

export const LayoutFurniImageView: FC<LayoutFurniImageViewProps> = (props) => {
    const { productType = 's', productClassId = -1, direction = 2, extraData = '', state = -1, scale = 1, recolor = -1, style = {}, ...rest } = props;
    const [imageElement, setImageElement] = useState<HTMLImageElement>(null);
    const isMounted = useRef(true);
    const requestIdRef = useRef(0);

    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    const updateImage = useCallback(async (result: IImageResult, requestId: number) => {
        if (!result?.data) return;

        // getImage() destroys the render texture once the image exists.
        const image = await result.getImage();

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

            if (!(scale % 1)) newStyle.imageRendering = PIXEL_ART_RENDERING;
        }

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [imageElement, scale, style]);

    useEffect(() => {
        const requestId = ++requestIdRef.current;

        setImageElement(null);

        let imageResult: ImageResult = null;

        const listener: IGetImageListener = {
            imageReady: (result) => updateImage(result, requestId),
            imageFailed: () => updateImage(null, requestId)
        };

        switch (productType.toLocaleLowerCase()) {
            case ProductTypeEnum.FLOOR:
                imageResult = GetRoomEngine().getFurnitureFloorImage(productClassId, new Vector3d(direction), 64, listener, 0, extraData, state, -1, recolorData(recolor, state));
                break;
            case ProductTypeEnum.WALL:
                imageResult = GetRoomEngine().getFurnitureWallImage(productClassId, new Vector3d(direction), 64, listener, 0, extraData, state);
                break;
        }

        if (imageResult?.data) updateImage(imageResult, requestId);
    }, [productType, productClassId, direction, extraData, state, recolor, updateImage]);

    return <Base classNames={['furni-image']} style={getStyle} {...rest} />;
};
