import { GetGuestRoomMessageComposer, GetGuestRoomResultEvent } from '@octane/renderer';
import { useCallback, useRef } from 'react';
import { LocalizeText, localizeWithFallback, SendMessageComposer, TryVisitRoom } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** AIR HabboNewNavigator `ask_forward`: the room id of `navigator/ask_forward/<id>`, or 0 for anything else. */
export const askForwardRoomId = (value: string): number => {
    const roomId = Number.parseInt(value ?? '', 10);

    return Number.isInteger(roomId) && roomId > 0 && String(roomId) === (value ?? '').trim() ? roomId : 0;
};

/**
 * AIR HabboNewNavigator `navigator/ask_forward/<room id>`: asks for the room's info, then "Go to room X?", and
 * visits the room on OK only. A plain `navigator/goto/<id>` goes at once; this is the link for news items and
 * alerts that should not move the user without asking.
 */
export const useNavigatorAskForward = () => {
    // The room a link asked about, until its room info arrives.
    const pendingRoomId = useRef(0);
    const { showConfirm = null } = useNotification();

    const askForward = useCallback((roomId: number) => {
        if (!(roomId > 0)) return;

        pendingRoomId.current = roomId;

        // Room info only (false, false), as AIR sends it: no forward, and the navigator ignores an "entered" answer
        // about a room the user is not in.
        SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
    }, []);

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        const roomId = pendingRoomId.current;

        if (!roomId) return;

        const data = event.getParser().data;

        if (!data || data.roomId !== roomId) return;

        pendingRoomId.current = 0;

        showConfirm(
            LocalizeText('navigator.forward_confirmation.desc', ['room_name'], [data.roomName ?? '']),
            () => TryVisitRoom(roomId),
            null,
            null,
            null,
            localizeWithFallback('navigator.forward_confirmation.title', 'Go to room')
        );
    });

    return { askForward };
};
