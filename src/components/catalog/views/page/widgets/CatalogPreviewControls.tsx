import { RoomPreviewer } from '@octane/renderer';
import { FC, MouseEvent, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ProductTypeEnum } from '../../../../../api';
import previewArrowLeft from '../../../../../assets/images/catalog/air/preview-arrow-left.png';
import previewArrowRight from '../../../../../assets/images/catalog/air/preview-arrow-right.png';

interface CatalogPreviewControlsProps {
    productType: string;
    roomPreviewer: RoomPreviewer | null;
}

type DirectionalRoomPreviewer = RoomPreviewer & {
    changeRoomObjectDirection(clockwise?: boolean): void;
    cycleAvatarAction?(): void;
    getPreviewCapabilities?(): PreviewCapabilities;
    subscribePreviewCapabilities?(listener: () => void): () => void;
};

interface PreviewCapabilities {
    mode: 'none' | 'floor' | 'wall' | 'avatar' | 'pet';
    canRotate: boolean;
    canChangeState: boolean;
    canUseAvatarActions: boolean;
    canZoomIn: boolean;
    canZoomOut: boolean;
}

const CatalogPreviewArrowIcon: FC<{ direction: 'left' | 'right' }> = ({ direction }) => (
    <img
        alt=""
        aria-hidden="true"
        className="octane-catalog-preview-arrow"
        draggable={false}
        src={direction === 'left' ? previewArrowLeft : previewArrowRight}
    />
);

const getFallbackCapabilities = (productType: string): PreviewCapabilities => {
    if (productType === ProductTypeEnum.FLOOR || productType === ProductTypeEnum.WALL) {
        return {
            mode: productType === ProductTypeEnum.FLOOR ? 'floor' : 'wall',
            canRotate: true,
            canChangeState: true,
            canUseAvatarActions: false,
            canZoomIn: false,
            canZoomOut: false
        };
    }

    if (productType === ProductTypeEnum.EFFECT || productType === ProductTypeEnum.ROBOT) {
        return {
            mode: 'avatar',
            canRotate: true,
            canChangeState: false,
            canUseAvatarActions: true,
            canZoomIn: true,
            canZoomOut: true
        };
    }

    if (productType === ProductTypeEnum.PET) {
        return {
            mode: 'pet',
            canRotate: false,
            canChangeState: false,
            canUseAvatarActions: false,
            canZoomIn: true,
            canZoomOut: true
        };
    }

    return {
        mode: 'none',
        canRotate: false,
        canChangeState: false,
        canUseAvatarActions: false,
        canZoomIn: false,
        canZoomOut: false
    };
};

const CatalogPreviewControlsContent: FC<Required<CatalogPreviewControlsProps>> = ({ productType, roomPreviewer }) => {
    const directionalPreviewer = roomPreviewer as DirectionalRoomPreviewer;
    const [avatarZoomed, setAvatarZoomed] = useState(true);
    const fallbackCapabilities = useMemo(() => getFallbackCapabilities(productType), [productType]);
    const subscribe = useCallback(
        (listener: () => void) => directionalPreviewer.subscribePreviewCapabilities?.(listener) ?? (() => undefined),
        [directionalPreviewer]
    );
    const getSnapshot = useCallback(
        () => directionalPreviewer.getPreviewCapabilities?.() ?? fallbackCapabilities,
        [directionalPreviewer, fallbackCapabilities]
    );
    const capabilities = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const isAvatarPreview = capabilities.mode === 'avatar';
    const showRotationControls = isAvatarPreview || capabilities.mode === 'floor' || (capabilities.mode === 'wall' && capabilities.canRotate);
    const canToggleZoom = isAvatarPreview && (capabilities.canZoomIn || capabilities.canZoomOut);
    const canChangeAvatarAction = isAvatarPreview && capabilities.canUseAvatarActions && !!directionalPreviewer.cycleAvatarAction;

    useEffect(() => setAvatarZoomed(true), [directionalPreviewer, productType]);

    if (!showRotationControls && !canToggleZoom && !canChangeAvatarAction) return null;

    const runPreviewAction = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
        event.preventDefault();
        event.stopPropagation();
        action();
    };

    return (
        <div className={`octane-catalog-preview-controls is-${capabilities.mode}`} role="toolbar" aria-label="Product preview">
            {showRotationControls && (
                <>
                    <button
                        aria-label="Rotate left"
                        className="octane-catalog-preview-btn is-left"
                        disabled={!capabilities.canRotate}
                        type="button"
                        onClick={(event) => runPreviewAction(event, () => directionalPreviewer.changeRoomObjectDirection(true))}
                    >
                        <CatalogPreviewArrowIcon direction="left" />
                    </button>
                    <button
                        aria-label="Rotate right"
                        className="octane-catalog-preview-btn is-right"
                        disabled={!capabilities.canRotate}
                        type="button"
                        onClick={(event) => runPreviewAction(event, () => directionalPreviewer.changeRoomObjectDirection(false))}
                    >
                        <CatalogPreviewArrowIcon direction="right" />
                    </button>
                </>
            )}
            {canToggleZoom && (
                <button
                    aria-label="Toggle zoom"
                    aria-pressed={avatarZoomed}
                    className="octane-catalog-preview-region octane-catalog-preview-zoom-btn"
                    type="button"
                    onClick={(event) => runPreviewAction(event, () => setAvatarZoomed((value) => !value))}
                >
                    <i aria-hidden="true" className="octane-icon icon-zoom-more" />
                </button>
            )}
            {isAvatarPreview && (
                <button
                    aria-label="Change avatar action"
                    className="octane-catalog-preview-region octane-catalog-preview-action-btn"
                    disabled={!canChangeAvatarAction}
                    type="button"
                    onClick={(event) => runPreviewAction(event, () => directionalPreviewer.cycleAvatarAction?.())}
                >
                    <span aria-hidden="true" className="octane-catalog-preview-action-icon" />
                </button>
            )}
        </div>
    );
};

export const CatalogPreviewControls: FC<CatalogPreviewControlsProps> = ({ productType, roomPreviewer }) => {
    if (!roomPreviewer || productType === ProductTypeEnum.BADGE) return null;

    return <CatalogPreviewControlsContent productType={productType} roomPreviewer={roomPreviewer} />;
};
