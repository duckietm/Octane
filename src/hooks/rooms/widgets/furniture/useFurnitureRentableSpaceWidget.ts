import {
    GetRoomEngine,
    GetSessionDataManager,
    RentableSpaceCancelRentMessageComposer,
    RentableSpaceRentFailedMessageEvent,
    RentableSpaceRentMessageComposer,
    RentableSpaceRentOkMessageEvent,
    RentableSpaceStatusMessageComposer,
    RentableSpaceStatusMessageEvent,
    RoomEngineTriggerWidgetEvent,
    RoomId,
    RoomWidgetEnum
} from '@octane/renderer';
import { useCallback, useState } from 'react';
import { IsOwnerOfFurniture, SendMessageComposer } from '../../../../api';
import { RentableSpaceStatus } from '../../../../components/room/widgets/furniture/rentableSpace.helpers';
import { useMessageEvent, useOctaneEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';

// The official widget shows "Cancel rental space" to the furni owner and to
// staff with security level 5 (IRoomWidgetHandlerContainer.hasSecurity(5)).
const CANCEL_RENT_SECURITY_LEVEL = 5;

/**
 * State of the official RWE_RENTABLESPACE widget: opened by using a
 * `furniture_rentable_space` furni, it asks the server for the rent status
 * (872), rents (2946) or cancels the rent (1667) and refreshes after a
 * RentableSpaceRentOk, showing the RentableSpaceRentFailed reason otherwise.
 */
const useFurnitureRentableSpaceWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [status, setStatus] = useState<RentableSpaceStatus>(null);
    const [rentErrorCode, setRentErrorCode] = useState(-1);
    const [canCancelRent, setCanCancelRent] = useState(false);

    const onClose = useCallback(() => {
        setObjectId(-1);
        setCategory(-1);
        setStatus(null);
        setRentErrorCode(-1);
        setCanCancelRent(false);
    }, []);

    const requestStatus = useCallback((id: number) => {
        if (id === -1) return;

        SendMessageComposer(new RentableSpaceStatusMessageComposer(id));
    }, []);

    const rent = useCallback(() => {
        if (objectId === -1) return;

        SendMessageComposer(new RentableSpaceRentMessageComposer(objectId));
    }, [objectId]);

    const cancelRent = useCallback(() => {
        if (objectId === -1) return;

        SendMessageComposer(new RentableSpaceCancelRentMessageComposer(objectId));
    }, [objectId]);

    useOctaneEvent<RoomEngineTriggerWidgetEvent>([RoomEngineTriggerWidgetEvent.OPEN_WIDGET, RoomEngineTriggerWidgetEvent.CLOSE_WIDGET], (event) => {
        if (event.widget !== RoomWidgetEnum.RENTABLESPACE) return;

        if (event.type === RoomEngineTriggerWidgetEvent.CLOSE_WIDGET) {
            if (event.objectId === objectId) onClose();

            return;
        }

        if (RoomId.isRoomPreviewerId(event.roomId)) return;

        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        setObjectId(event.objectId);
        setCategory(event.category);
        setStatus(null);
        setRentErrorCode(-1);
        setCanCancelRent(IsOwnerOfFurniture(roomObject) || GetSessionDataManager().hasSecurity(CANCEL_RENT_SECURITY_LEVEL));
        requestStatus(event.objectId);
    });

    useMessageEvent<RentableSpaceStatusMessageEvent>(RentableSpaceStatusMessageEvent, (event) => {
        if (objectId === -1) return;

        const parser = event.getParser();

        setRentErrorCode(-1);
        setStatus({
            rented: parser.rented,
            canRent: parser.canRent,
            canRentErrorCode: parser.canRentErrorCode,
            renterId: parser.renterId,
            renterName: parser.renterName,
            timeRemaining: parser.timeRemaining,
            price: parser.price
        });
    });

    useMessageEvent<RentableSpaceRentOkMessageEvent>(RentableSpaceRentOkMessageEvent, () => {
        if (objectId === -1) return;

        requestStatus(objectId);
    });

    useMessageEvent<RentableSpaceRentFailedMessageEvent>(RentableSpaceRentFailedMessageEvent, (event) => {
        if (objectId === -1) return;

        setRentErrorCode(event.getParser().reason);
    });

    useFurniRemovedEvent(objectId !== -1 && category !== -1, (event) => {
        if (event.id !== objectId || event.category !== category) return;

        onClose();
    });

    return { objectId, status, rentErrorCode, canCancelRent, onClose, rent, cancelRent };
};

export const useFurnitureRentableSpaceWidget = useFurnitureRentableSpaceWidgetState;
