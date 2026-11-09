import { HabbiconAssetManager } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { PIXEL_ART_RENDERING } from './PixelArtRendering';

export const LayoutHabbiconImageView: FC<{ id: number; collection?: boolean; outlined?: boolean; size?: number; className?: string; mirror?: boolean }> = ({
    id,
    collection = false,
    outlined = false,
    size = 40,
    className,
    mirror = false
}) => {
    const [source, setSource] = useState('');

    useEffect(() => {
        let disposed = false;
        const manager = HabbiconAssetManager.getInstance();
        setSource('');
        void manager.preload().then(() => {
            if (!disposed) setSource((collection ? manager.getCollectionIconUrl(id, outlined) : manager.getPreviewUrl(id)) || '');
        });
        return () => {
            disposed = true;
        };
    }, [id, collection, outlined]);

    return source ? (
        <img
            alt=""
            className={className}
            src={source}
            width={size}
            height={size}
            style={{ objectFit: collection ? 'none' : 'contain', imageRendering: PIXEL_ART_RENDERING, transform: mirror ? 'scaleX(-1)' : undefined }}
        />
    ) : null;
};
