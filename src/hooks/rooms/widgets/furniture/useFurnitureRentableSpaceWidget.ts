import {
    GetRoomEngine,
    RentableSpaceCancelRentMessageComposer,
    RentableSpaceRentFailedMessageEvent,
    RentableSpaceRentMessageComposer,
    RentableSpaceRentOkMessageEvent,
    RentableSpaceStatusMessageComposer,
    RentableSpaceStatusMessageEvent,
    RoomEngineTriggerWidgetEvent,
    RoomWidgetEnum,
    SecurityLevel
} from '@octane/renderer';
import { useRef, useState } from 'react';
import { HasSessionPermission, IsOwnerOfFurniture, SendMessageComposer } from '../../../../api';
import { useMessageEvent, useOctaneEvent } from '../../../events';
import { usePurse } from '../../../purse';
import { useFurniRemovedEvent } from '../../engine';
import { RentableSpaceStatus, resolveRentableSpaceRentView } from './useFurnitureRentableSpaceWidget.helpers';

interface RentableSpaceTarget {
    roomId: number;
    objectId: number;
    category: number;
}

/**
 * AIR RentableSpaceDisplayWidget + its handler: double-clicking a rentable space asks the server for
 * its status (RentableSpaceStatus); the window opens on the answer and shows the rent view (price,
 * rent button, why the user can't rent) or the rented view (renter, time left, cancel rent for the
 * furni owner and staff). RentOk re-requests the status, RentFailed shows the error view.
 */
const useFurnitureRentableSpaceWidgetState = () => {
    const [target, setTarget] = useState<RentableSpaceTarget>(null);
    const [status, setStatus] = useState<RentableSpaceStatus>(null);
    const [errorCode, setErrorCode] = useState(0);
    const [canCancelRent, setCanCancelRent] = useState(false);
    const targetRef = useRef<RentableSpaceTarget>(null);
    const { getCurrencyAmount = null } = usePurse();

    const objectId = target?.objectId ?? -1;
    const isOpen = !!target && !!status;
    const rentView = status && !status.rented ? resolveRentableSpaceRentView(status, getCurrencyAmount ? getCurrencyAmount(-1) : 0) : null;

    const requestStatus = (id: number) => {
        if (id < 0) return;

        SendMessageComposer(new RentableSpaceStatusMessageComposer(id));
    };

    const onClose = () => {
        targetRef.current = null;
        setTarget(null);
        setStatus(null);
        setErrorCode(0);
        setCanCancelRent(false);
    };

    const rent = () => {
        if (!target || !rentView?.rentEnabled) return;

        SendMessageComposer(new RentableSpaceRentMessageComposer(target.objectId));
    };

    const cancelRent = () => {
        if (!target) return;

        SendMessageComposer(new RentableSpaceCancelRentMessageComposer(target.objectId));
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>([RoomEngineTriggerWidgetEvent.OPEN_WIDGET, RoomEngineTriggerWidgetEvent.CLOSE_WIDGET], (event) => {
        if (event.widget !== RoomWidgetEnum.RENTABLESPACE) return;

        if (event.type === RoomEngineTriggerWidgetEvent.CLOSE_WIDGET) {
            if (targetRef.current?.objectId === event.objectId) onClose();

            return;
        }

        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        const next = { roomId: event.roomId, objectId: event.objectId, category: event.category };

        if (targetRef.current?.objectId !== event.objectId) {
            setStatus(null);
            setErrorCode(0);
        }

        targetRef.current = next;
        setTarget(next);
        setCanCancelRent(IsOwnerOfFurniture(roomObject) || HasSessionPermission('acc_anyroomowner', SecurityLevel.MODERATOR));
        requestStatus(event.objectId);
    });

    useMessageEvent<RentableSpaceStatusMessageEvent>(RentableSpaceStatusMessageEvent, (event) => {
        if (!targetRef.current) return;

        const parser = event.getParser();

        if (!parser) return;

        setErrorCode(0);
        setStatus({
            rented: parser.rented,
            canRent: parser.canRent,
            canRentErrorCode: parser.canRentErrorCode,
            renterId: parser.renterId,
            renterName: parser.renterName ?? '',
            timeRemaining: parser.timeRemaining,
            price: parser.price
        });
    });

    useMessageEvent<RentableSpaceRentOkMessageEvent>(RentableSpaceRentOkMessageEvent, () => {
        if (targetRef.current) requestStatus(targetRef.current.objectId);
    });

    useMessageEvent<RentableSpaceRentFailedMessageEvent>(RentableSpaceRentFailedMessageEvent, (event) => {
        if (!targetRef.current) return;

        setErrorCode(event.getParser()?.reason ?? 400);
    });

    useFurniRemovedEvent(!!target, (event) => {
        if (!target || event.id !== target.objectId || event.category !== target.category) return;

        onClose();
    });

    return { objectId, isOpen, status, rentView, errorCode, canCancelRent, rent, cancelRent, onClose };
};

export const useFurnitureRentableSpaceWidget = useFurnitureRentableSpaceWidgetState;
