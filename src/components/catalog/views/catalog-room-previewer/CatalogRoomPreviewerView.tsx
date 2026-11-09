import { GetEventDispatcher, OctaneToolbarAnimateIconEvent, RoomPreviewer, TextureUtils, ToolbarIconEnum } from '@octane/renderer';
import { FC, useRef } from 'react';
import { LayoutRoomPreviewerView } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { CatalogPurchasedEvent } from '../../../../events';
import { useUiEvent } from '../../../../hooks';

export const CatalogRoomPreviewerView: FC<{
    roomPreviewer: RoomPreviewer;
    height?: number;
}> = (props) => {
    const { roomPreviewer = null } = props;
    const elementRef = useRef<HTMLDivElement>(null);

    useUiEvent(CatalogPurchasedEvent.PURCHASE_SUCCESS, (event) => {
        if (!elementRef.current) return;

        const renderTexture = roomPreviewer.getRoomObjectCurrentImage();

        if (!renderTexture) return;

        (async () => {
            let image: HTMLImageElement = null;

            try {
                image = await TextureUtils.generateImage(renderTexture);
            } finally {
                // getRoomObjectCurrentImage() renders a fresh texture that nobody else owns, freed even on a failure.
                renderTexture.destroy(true);
            }

            // The catalog may have closed while the image was made: the ref is empty then.
            if (!image || !elementRef.current) return;

            const bounds = elementRef.current.getBoundingClientRect();

            const x = bounds.x + bounds.width / 2;
            const y = bounds.y + bounds.height / 2;

            const animateEvent = new OctaneToolbarAnimateIconEvent(image, x, y);

            animateEvent.iconName = ToolbarIconEnum.INVENTORY;

            GetEventDispatcher().dispatchEvent(animateEvent);
        })();
    });

    return (
        <NativeTextTree>
            <div ref={elementRef}>
                <LayoutRoomPreviewerView {...props} />
            </div>
        </NativeTextTree>
    );
};
