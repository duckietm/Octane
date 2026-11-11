import { CreateLinkEvent, GetGuestRoomMessageComposer, GetGuestRoomResultEvent, GetRoomEngine, RoomEngineTriggerWidgetEvent, RoomObjectVariable } from '@octane/renderer';
import { useRef } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../../api';
import { useMessageEvent, useOctaneEvent } from '../../../events';
import { useNotification } from '../../../notification';

const INTERNALLINK = 'internalLink';

/**
 * AIR FurnitureRoomLinkHandler: `room.link.confirmation.message` with the room's name and owner filled in. The pack
 * writes the placeholders as `%%room_name%%` / `%%room_owner%%` and its line breaks as a literal "\n".
 */
export const roomLinkConfirmationMessage = (template: string, roomName: string, ownerName: string): string =>
    (template ?? '')
        .replace(/%%room_name%%/g, roomName ?? '')
        .replace(/%%room_owner%%/g, ownerName ?? '')
        .replace(/\\n/g, '\n');

const useFurnitureRoomLinkWidgetState = () => {
    // The room a double-clicked link furni points at, until its room info arrives.
    const pendingRoomId = useRef(0);
    const { showConfirm = null } = useNotification();

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_ROOM_LINK, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        const data = roomObject.model.getValue<any>(RoomObjectVariable.FURNITURE_DATA);

        let link = data?.[INTERNALLINK];

        if (!link || !link.length) link = roomObject.model.getValue<string>(RoomObjectVariable.FURNITURE_INTERNAL_LINK);

        if (!link || !link.length) return;

        const roomId = parseInt(link, 10);

        if (isNaN(roomId) || roomId <= 0) return;

        pendingRoomId.current = roomId;

        // As AIR does: ask for the room's info only (false, false), then confirm with its name and owner. The
        // navigator ignores an "entered" answer about a room the user is not in (adoptsEnteredRoom), so this no
        // longer points room info, settings and favourites at the linked room.
        SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
    });

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        const roomId = pendingRoomId.current;

        if (!roomId) return;

        const data = event.getParser().data;

        if (!data || data.roomId !== roomId) return;

        pendingRoomId.current = 0;

        showConfirm(
            roomLinkConfirmationMessage(
                localizeWithFallback('room.link.confirmation.message', 'You are about to go to another room. Are you sure?\\n\\nRoom: %%room_name%%\\nOwner: %%room_owner%%'),
                data.roomName,
                data.ownerName
            ),
            () => CreateLinkEvent(`navigator/goto/${roomId}`),
            null,
            null,
            null,
            localizeWithFallback('room.link.confirmation.title', 'Go to another room')
        );
    });

    return {};
};

export const useFurnitureRoomLinkWidget = useFurnitureRoomLinkWidgetState;
