import { GetRoomEngine, IPetCustomPart, PetFigureData, Vector3d } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from 'react';
import { Base, BaseProps } from '../Base';
import { PIXEL_ART_RENDERING } from './PixelArtRendering';

const EMPTY_CUSTOM_PARTS: IPetCustomPart[] = [];

interface LayoutPetImageViewProps extends BaseProps<HTMLDivElement> {
    figure?: string;
    typeId?: number;
    paletteId?: number;
    petColor?: number;
    customParts?: IPetCustomPart[];
    posture?: string;
    headOnly?: boolean;
    direction?: number;
    scale?: number;
}

export const LayoutPetImageView: FC<LayoutPetImageViewProps> = (props) => {
    const {
        figure = '',
        typeId = -1,
        paletteId = -1,
        petColor = 0xffffff,
        customParts = EMPTY_CUSTOM_PARTS,
        posture = 'std',
        headOnly = false,
        direction = 0,
        scale = 1,
        style = {},
        ...rest
    } = props;
    const [petUrl, setPetUrl] = useState<string>(null);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const isDisposed = useRef(false);
    const imageRequestGeneration = useRef(0);

    const getStyle = useMemo(() => {
        let newStyle: CSSProperties = {};

        if (petUrl && petUrl.length) newStyle.backgroundImage = `url(${petUrl})`;

        if (scale !== 1) {
            newStyle.transform = `scale(${scale})`;

            if (!(scale % 1)) newStyle.imageRendering = PIXEL_ART_RENDERING;
        }

        newStyle.width = width;
        newStyle.height = height;

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [petUrl, scale, style, width, height]);

    useEffect(() => {
        const generation = ++imageRequestGeneration.current;
        const isCurrentRequest = () => !isDisposed.current && imageRequestGeneration.current === generation;

        let petTypeId = typeId;
        let petPaletteId = paletteId;
        let petColor1 = petColor;
        let petCustomParts: IPetCustomPart[] = customParts;
        let petHeadOnly = headOnly;

        if (figure && figure.length) {
            const petFigureData = new PetFigureData(figure);

            petTypeId = petFigureData.typeId;
            petPaletteId = petFigureData.paletteId;
            petColor1 = petFigureData.color;
            petCustomParts = petFigureData.customParts;
        }

        if (petTypeId === 16) petHeadOnly = false;

        const imageResult = GetRoomEngine().getRoomObjectPetImage(
            petTypeId,
            petPaletteId,
            petColor1,
            new Vector3d(direction * 45),
            64,
            {
                imageReady: async (result) => {
                    if (!isCurrentRequest()) {
                        result.dispose();
                        return;
                    }

                    const { image, data: texture } = result;

                    if (image) {
                        setPetUrl(image.src);
                        setWidth(image.width);
                        setHeight(image.height);
                    } else if (texture) {
                        // Read the size first: getImage() releases the render texture.
                        const { width, height } = texture;
                        const generated = await result.getImage();

                        if (!isCurrentRequest()) return;

                        setPetUrl(generated?.src ?? null);
                        setWidth(width);
                        setHeight(height);
                    }
                },
                imageFailed: () => {
                    // no-op
                }
            },
            petHeadOnly,
            0,
            petCustomParts,
            posture
        );

        if (imageResult) {
            (async () => {
                const image = await imageResult.getImage();

                if (image && isCurrentRequest()) {
                    setPetUrl(image.src);
                    setWidth(image.width);
                    setHeight(image.height);
                }
            })();
        }

        return () => {
            if (imageRequestGeneration.current === generation) imageRequestGeneration.current++;
        };
    }, [figure, typeId, paletteId, petColor, customParts, posture, headOnly, direction]);

    useEffect(() => {
        isDisposed.current = false;

        return () => {
            isDisposed.current = true;
        };
    }, []);

    return <Base classNames={['pet-image']} style={getStyle} {...rest} />;
};
