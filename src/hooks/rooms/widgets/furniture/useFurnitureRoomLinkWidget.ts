import { GetGuestRoomResultEvent, GetRoomEngine, RoomEngineTriggerWidgetEvent, RoomObjectVariable } from '@octane/renderer';
import { useState } from 'react';
import { TryVisitRoom } from '../../../../api';
import { useMessageEvent, useOctaneEvent } from '../../../events';

const INTERNALLINK = 'internalLink';

const useFurnitureRoomLinkWidgetState = () => {
    const [roomIdToEnter, setRoomIdToEnter] = useState(0);

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_ROOM_LINK, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        const data = roomObject.model.getValue<any>(RoomObjectVariable.FURNITURE_DATA);

        let roomId = data[INTERNALLINK];

        if (!roomId || !roomId.length) roomId = roomObject.model.getValue<string>(RoomObjectVariable.FURNITURE_INTERNAL_LINK);

        if (!roomId || !roomId.length) return;

        roomId = parseInt(roomId, 10);

        if (isNaN(roomId)) return;

        setRoomIdToEnter(roomId);

        // TryVisitRoom, i.e. (roomId, false, true), as AIR does. The server reads
        // enterRoom as `a != 0 || b != 1`, so (false, false) asked it to *enter* without
        // the client ever entering: the navigator took the answer as "we are now in that
        // room" and pointed room info, settings, the word filter and favourites at the
        // linked room, while the user stayed where they were and the double click did
        // nothing.
        TryVisitRoom(roomId);
    });

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        if (!roomIdToEnter) return;

        const parser = event.getParser();

        if (parser.data.roomId !== roomIdToEnter) return;

        setRoomIdToEnter(0);
    });

    return {};
};

export const useFurnitureRoomLinkWidget = useFurnitureRoomLinkWidgetState;
