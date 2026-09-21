import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from 'react';
import { Base, BaseProps } from '../Base';
import { cropAirMeMenuFaceImageUrl, cropOpaqueBoundsImageUrl, cropTransparentImageUrl, dataUrlToBlob } from './avatarImageCrop';
import { PIXEL_ART_RENDERING } from './PixelArtRendering';

const AVATAR_CACHE_MAX_SIZE = 200;
// Holds the encoded PNG bytes; every mounted view makes (and revokes) its own
// object url, so evicting an entry never breaks an image still on screen.
const AVATAR_IMAGE_CACHE: Map<string, Blob> = new Map();

export interface LayoutAvatarImageViewProps extends BaseProps<HTMLDivElement> {
    figure: string;
    gender?: string;
    headOnly?: boolean;
    direction?: number;
    scale?: number;
    fit?: boolean;
    compactHead?: boolean;
    compactHeadSize?: number;
    compactHeadPadding?: number;
    airMeMenu?: boolean;
    nativeCroppedHead?: boolean;
}

export const LayoutAvatarImageView: FC<LayoutAvatarImageViewProps> = (props) => {
    const {
        figure = '',
        gender = '',
        headOnly = false,
        direction = 0,
        scale = 1,
        fit = false,
        compactHead = false,
        compactHeadSize = 22,
        compactHeadPadding = 1,
        airMeMenu = false,
        nativeCroppedHead = false,
        classNames = [],
        style = {},
        ...rest
    } = props;
    const [avatarUrl, setAvatarUrl] = useState<string>(null);
    const [isReady, setIsReady] = useState<boolean>(false);
    const isDisposed = useRef(false);
    const requestIdRef = useRef(0);
    const objectUrlRef = useRef<string>(null);

    const getClassNames = useMemo(() => {
        let newClassNames: string[];

        if (airMeMenu) {
            newClassNames = ['tb-memenu-face pointer-events-none'];
        } else if (nativeCroppedHead) {
            newClassNames = ['avatar-image relative pointer-events-none'];
        } else if (fit) {
            newClassNames = ['avatar-image avatar-image-fit absolute inset-0 pointer-events-none'];
        } else if (headOnly) {
            newClassNames = ['avatar-image absolute inset-0 bg-no-repeat pointer-events-none'];
        } else {
            newClassNames = ['avatar-image relative w-[90px] h-[130px] bg-no-repeat left-[-2px] pointer-events-none'];
        }

        if (classNames.length) newClassNames.push(...classNames);
        if (compactHead) newClassNames.push('compact-head');

        return newClassNames;
    }, [classNames, headOnly, fit, compactHead, airMeMenu, nativeCroppedHead]);

    const getStyle = useMemo(() => {
        let newStyle: CSSProperties = {};

        if (!fit && !nativeCroppedHead && !airMeMenu && avatarUrl && avatarUrl.length) newStyle.backgroundImage = `url('${avatarUrl}')`;

        if (headOnly && !fit && !nativeCroppedHead && !airMeMenu) {
            newStyle.backgroundSize = compactHead ? `${compactHeadSize}px ${compactHeadSize}px` : '130px auto';
            newStyle.backgroundPosition = compactHead ? 'center' : '51% 40%';
            newStyle.imageRendering = compactHead ? 'auto' : PIXEL_ART_RENDERING;
        }

        if (scale !== 1) {
            newStyle.transform = `scale(${scale})`;

            if (!(scale % 1)) newStyle.imageRendering = PIXEL_ART_RENDERING;
        }

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [avatarUrl, scale, style, headOnly, fit, compactHead, compactHeadSize, airMeMenu, nativeCroppedHead]);

    useEffect(() => {
        if (!isReady) return;

        const requestId = ++requestIdRef.current;
        const figureKey = [figure, gender, direction, headOnly, compactHead, compactHeadSize, compactHeadPadding, fit, airMeMenu, nativeCroppedHead].join('-');

        const applyImage = (image: Blob | string) => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

            objectUrlRef.current = typeof image === 'string' ? null : URL.createObjectURL(image);

            setAvatarUrl(objectUrlRef.current ?? (image as string));
        };

        if (AVATAR_IMAGE_CACHE.has(figureKey)) {
            applyImage(AVATAR_IMAGE_CACHE.get(figureKey));
        } else {
            const resetFigure = async (_figure: string) => {
                if (isDisposed.current || requestIdRef.current !== requestId) return;

                const avatarImage = GetAvatarRenderManager().createAvatarImage(_figure, AvatarScaleType.LARGE, gender, {
                    resetFigure: (figure: string) => resetFigure(figure),
                    dispose: null,
                    disposed: false
                });

                let setType = AvatarSetType.FULL;

                if (headOnly && !airMeMenu) setType = AvatarSetType.HEAD;

                avatarImage.setDirection(setType, direction);

                let imageUrl = nativeCroppedHead ? avatarImage.processAsCroppedImageUrl(setType) : avatarImage.processAsImageUrl(setType);

                if (imageUrl && airMeMenu) imageUrl = await cropAirMeMenuFaceImageUrl(imageUrl);

                if (imageUrl && headOnly && compactHead && !airMeMenu && !nativeCroppedHead)
                    imageUrl = await cropTransparentImageUrl(imageUrl, compactHeadSize, compactHeadPadding);

                // The full-body canvas is 90x130 with the figure occupying
                // only part of it, off-center for some figures. Fit consumers
                // (grid tiles) object-contain the image, so crop the
                // transparent border first — otherwise the figure renders
                // tiny and drifts sideways inside the tile.
                if (imageUrl && fit && !nativeCroppedHead) imageUrl = await cropOpaqueBoundsImageUrl(imageUrl);

                if (imageUrl && !isDisposed.current && requestIdRef.current === requestId) {
                    const blob = dataUrlToBlob(imageUrl);

                    if (blob && !avatarImage.isPlaceholder()) {
                        if (AVATAR_IMAGE_CACHE.size >= AVATAR_CACHE_MAX_SIZE) {
                            const firstKey = AVATAR_IMAGE_CACHE.keys().next().value;
                            AVATAR_IMAGE_CACHE.delete(firstKey);
                        }

                        AVATAR_IMAGE_CACHE.set(figureKey, blob);
                    }

                    applyImage(blob ?? imageUrl);
                }

                avatarImage.dispose();
            };

            resetFigure(figure);
        }
    }, [figure, gender, direction, headOnly, compactHead, compactHeadSize, compactHeadPadding, fit, airMeMenu, nativeCroppedHead, isReady]);

    useEffect(() => {
        isDisposed.current = false;

        setIsReady(true);

        return () => {
            isDisposed.current = true;

            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

            objectUrlRef.current = null;
        };
    }, []);

    return (
        <Base classNames={getClassNames} style={getStyle} {...rest}>
            {airMeMenu && avatarUrl && avatarUrl.length > 0 && (
                <img src={avatarUrl} alt="" draggable={false} className="tb-memenu-face-img" />
            )}
            {nativeCroppedHead && avatarUrl && avatarUrl.length > 0 && (
                <img
                    src={avatarUrl}
                    alt=""
                    draggable={false}
                    style={{ display: 'block', width: 'auto', maxWidth: 'none', height: 'auto', imageRendering: PIXEL_ART_RENDERING }}
                />
            )}
            {fit && !nativeCroppedHead && !airMeMenu && avatarUrl && avatarUrl.length > 0 && (
                <img
                    src={avatarUrl}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ imageRendering: PIXEL_ART_RENDERING }}
                />
            )}
        </Base>
    );
};
