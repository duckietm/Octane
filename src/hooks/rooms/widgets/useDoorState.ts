import {
    DoorbellMessageEvent,
    FlatAccessDeniedMessageEvent,
    GenericErrorEvent,
    GetGuestRoomResultEvent,
    GetSessionDataManager,
    RoomDataParser,
    RoomDoorbellAcceptedEvent
} from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { DoorStateType, GenericErrorCode } from '../../../api';
import { useMessageEvent } from '../../events';

export type DoorStateSnapshot = {
    roomInfo: RoomDataParser | null;
    state: number;
};

const INITIAL: DoorStateSnapshot = { roomInfo: null, state: DoorStateType.NONE };

const useDoorStateStore = () => {
    const [snapshot, setSnapshot] = useState<DoorStateSnapshot>(INITIAL);

    const handleDoorbell = useCallback((event: DoorbellMessageEvent) => {
        const parser = event.getParser();
        if (parser.userName && parser.userName.length > 0) return;
        setSnapshot((prev) => ({ ...prev, state: DoorStateType.STATE_WAITING }));
    }, []);

    const handleAccepted = useCallback((event: RoomDoorbellAcceptedEvent) => {
        const parser = event.getParser();
        if (parser.userName && parser.userName.length > 0) return;
        setSnapshot((prev) => ({ ...prev, state: DoorStateType.STATE_ACCEPTED }));
    }, []);

    const handleDenied = useCallback((event: FlatAccessDeniedMessageEvent) => {
        const parser = event.getParser();
        if (parser.userName && parser.userName.length > 0) return;
        setSnapshot((prev) => ({ ...prev, state: DoorStateType.STATE_NO_ANSWER }));
    }, []);

    const handleGenericError = useCallback((event: GenericErrorEvent) => {
        const parser = event.getParser();
        if (parser.errorCode !== GenericErrorCode.WRONG_ROOM_PASSWORD) return;
        setSnapshot((prev) => ({ ...prev, state: DoorStateType.STATE_WRONG_PASSWORD }));
    }, []);

    const handleGuestRoom = useCallback((event: GetGuestRoomResultEvent) => {
        const parser = event.getParser();
        if (parser.roomEnter) {
            setSnapshot(INITIAL);
            return;
        }
        if (!parser.roomForward) return;
        if (parser.data.ownerName === GetSessionDataManager().userName) return;
        if (parser.isGroupMember) return;
        if (parser.data.doorMode === RoomDataParser.DOORBELL_STATE) {
            setSnapshot({ roomInfo: parser.data, state: DoorStateType.START_DOORBELL });
            return;
        }
        if (parser.data.doorMode === RoomDataParser.PASSWORD_STATE) {
            setSnapshot({ roomInfo: parser.data, state: DoorStateType.START_PASSWORD });
        }
    }, []);

    useMessageEvent<DoorbellMessageEvent>(DoorbellMessageEvent, handleDoorbell);
    useMessageEvent<RoomDoorbellAcceptedEvent>(RoomDoorbellAcceptedEvent, handleAccepted);
    useMessageEvent<FlatAccessDeniedMessageEvent>(FlatAccessDeniedMessageEvent, handleDenied);
    useMessageEvent<GenericErrorEvent>(GenericErrorEvent, handleGenericError);
    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, handleGuestRoom);

    const reset = useCallback(() => setSnapshot(INITIAL), []);

    return { snapshot, setSnapshot, reset };
};

export const useDoorState = () => useSharedHook(useDoorStateStore);

registerSharedHook(useDoorStateStore);
