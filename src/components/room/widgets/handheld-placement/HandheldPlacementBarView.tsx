import { CreateLinkEvent, GetRoomEngine } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaCheck, FaSyncAlt } from 'react-icons/fa';
import { cancelRoomObjectPlacement, CommitHandheldPlacement, getPlacingItemId, isRoomObjectPlacementActive, localizeWithFallback, ShowHandheldPlacementPreview } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useIsHandheld, useRoom } from '../../../../hooks';
import { useCatalogStore } from '../../../../hooks/catalog/catalogStore';

/** The engine has no "placement started" event, so the phone layout looks every this many ms while in a room. */
const PLACEMENT_POLL_MS = 250;

/** Stops the placement and brings back the window it came from, as the desktop's Escape / right click does. */
const cancelPlacement = () => {
    const catalog = useCatalogStore.getState();

    if (catalog.objectMoverRequested && catalog.purchasableOffer) {
        catalog.cancelObjectMover();
        CreateLinkEvent('catalog/show');
        return;
    }

    if (getPlacingItemId() !== -1) {
        cancelRoomObjectPlacement();
        CreateLinkEvent('inventory/show');
        return;
    }

    GetRoomEngine().cancelRoomObjectPlacement();
};

/**
 * Phone layout: while an item is being placed or moved, a bar above the toolbar says what to do and gives
 * the three choices a finger needs (done, rotate, place). A tap in the room only moves the preview there,
 * so an item is never dropped by accident.
 */
export const HandheldPlacementBarView: FC<{}> = () => {
    const isHandheld = useIsHandheld();
    const { roomSession = null } = useRoom();
    const [isPlacing, setIsPlacing] = useState(false);

    useEffect(() => {
        if (!isHandheld || !roomSession) {
            setIsPlacing(false);
            return;
        }

        const check = () => setIsPlacing(isRoomObjectPlacementActive());

        check();

        const interval = window.setInterval(check, PLACEMENT_POLL_MS);

        return () => window.clearInterval(interval);
    }, [isHandheld, roomSession]);

    // A placement that just started shows its item at once, in the middle of the room, before any touch.
    useEffect(() => {
        if (isHandheld && isPlacing) ShowHandheldPlacementPreview();
    }, [isHandheld, isPlacing]);

    if (!isHandheld || !isPlacing) return null;

    const place = () => {
        if (CommitHandheldPlacement()) setIsPlacing(isRoomObjectPlacementActive());
    };

    const cancel = () => {
        cancelPlacement();
        setIsPlacing(false);
    };

    const placeLabel = localizeWithFallback('octane.handheld.placement.place', 'Place');
    const rotateLabel = localizeWithFallback('octane.handheld.placement.rotate', 'Rotate');
    const doneLabel = localizeWithFallback('octane.handheld.placement.done', 'Done');

    return (
        <NativeTextTree>
            <div className="octane-handheld-placement" role="toolbar" aria-label={localizeWithFallback('octane.handheld.placement.title', 'Placing an item')}>
                <p className="octane-handheld-placement__hint">{localizeWithFallback('octane.handheld.placement.hint', 'Drag or tap to move it, then place it.')}</p>
                <div className="octane-handheld-placement__actions">
                    {/* Placing goes on while more of the same item are left, so leaving it reads as "done", not as an error. */}
                    <BaseButton className="octane-handheld-placement__button is-done" onClick={cancel}>
                        {doneLabel}
                    </BaseButton>
                    <BaseButton aria-label={rotateLabel} className="octane-handheld-placement__button is-rotate" onClick={() => GetRoomEngine().rotateActiveObjectPreview(true)}>
                        <FaSyncAlt aria-hidden="true" />
                    </BaseButton>
                    <BaseButton aria-label={placeLabel} className="octane-handheld-placement__button is-place" onClick={place}>
                        <FaCheck aria-hidden="true" />
                    </BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
