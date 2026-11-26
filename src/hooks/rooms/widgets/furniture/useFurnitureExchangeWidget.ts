import { FurnitureExchangeComposer, GetRoomEngine, RedeemEmeraldFurniComposer, RoomEngineTriggerWidgetEvent, RoomObjectVariable } from '@octane/renderer';
import { useState } from 'react';
import { GetConfigurationValue, IsOwnerOfFurniture, SendMessageComposer } from '../../../../api';
import { useOctaneEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';

/**
 * Whether the exchange window stays shut for this furni. Habbo calls every CFC_ credit furni a "Non-redeemable item";
 * a hotel that switches the server setting hotel.furni.cfc.redeemable off refuses to exchange them, and the client
 * setting furni.cfc.redeemable (default true, as the server's) mirrors it.
 */
export const isCreditFurniExchangeHidden = (furniType: string, cfcRedeemable: unknown): boolean => {
    const redeemable = !(cfcRedeemable === false || cfcRedeemable === 0 || cfcRedeemable === 'false' || cfcRedeemable === '0');

    return !redeemable && (furniType ?? '').toUpperCase().startsWith('CFC_');
};

const useFurnitureExchangeWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [value, setValue] = useState(0);
    // furniture_nft_credit: an emerald furni, redeemed for emeralds (official `nft.credit.converting.enabled`).
    const [isNft, setIsNft] = useState(false);

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setValue(0);
        setIsNft(false);
    };

    const redeem = () => {
        SendMessageComposer(isNft ? new RedeemEmeraldFurniComposer(objectId) : new FurnitureExchangeComposer(objectId));

        onClose();
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_CREDITFURNI, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject || !IsOwnerOfFurniture(roomObject)) return;

        if (isCreditFurniExchangeHidden(roomObject.type, GetConfigurationValue<unknown>('furni.cfc.redeemable', true))) return;

        const nft = roomObject.model.getValue<string>(RoomObjectVariable.FURNITURE_NFT_CREDIT) === 'true';

        if (nft && GetConfigurationValue<boolean>('nft.credit.converting.enabled', false) !== true) return;

        setIsNft(nft);
        setObjectId(event.objectId);
        setCategory(event.category);
        setValue(roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_CREDIT_VALUE) || 0);
    });

    useFurniRemovedEvent(objectId !== -1 && category !== -1, (event) => {
        if (event.id !== objectId || event.category !== category) return;

        onClose();
    });

    return { objectId, value, isNft, redeem, onClose };
};

export const useFurnitureExchangeWidget = useFurnitureExchangeWidgetState;
