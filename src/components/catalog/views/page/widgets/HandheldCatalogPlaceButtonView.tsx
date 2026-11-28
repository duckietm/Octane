import { FC } from 'react';
import { FaArrowsAlt } from 'react-icons/fa';
import { IPurchasableOffer } from '../../../../../api/catalog/IPurchasableOffer';
import { localizeWithFallback } from '../../../../../api/utils/localizeWithFallback';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useIsHandheld } from '../../../../../hooks/handheld/useHandheldLayout';

export interface HandheldCatalogPlaceButtonViewProps {
    offer: IPurchasableOffer | null;
    /** The catalogue's check whether the offer can be put into the room you are in. */
    isDraggable?: ((offer: IPurchasableOffer) => boolean) | null;
    /** Starts the room placement (the catalogue's requestOfferToMover). */
    onPlace?: ((offer: IPurchasableOffer) => void) | null;
}

/**
 * Phone layout: a finger cannot drag a tile out of the catalogue into the room as a mouse does, so an offer
 * that could be dragged gets a button instead. The catalogue steps aside while the item is placed with the
 * placement bar, and comes back once it is placed (and bought) or the placement is cancelled. The Builders
 * Club warehouse has its own place buttons, so the purchase widget does not show this one there.
 */
export const HandheldCatalogPlaceButtonView: FC<HandheldCatalogPlaceButtonViewProps> = ({ offer = null, isDraggable = null, onPlace = null }) => {
    const isHandheld = useIsHandheld();

    if (!isHandheld || !offer || !onPlace || !isDraggable?.(offer)) return null;

    return (
        <NativeTextTree>
            <BaseButton className="octane-handheld-shop__place" onClick={() => onPlace(offer)}>
                <FaArrowsAlt aria-hidden="true" />
                <span>{localizeWithFallback('octane.handheld.catalog.place', 'Place in room')}</span>
            </BaseButton>
        </NativeTextTree>
    );
};
