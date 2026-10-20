import { CanCreateRoomEvent } from '@octane/renderer';
import { localizeWithFallback } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

export const ROOM_CREATE_ALLOWED = 0;
export const HC_CENTER_LINK = 'habboUI/open/hccenter';

export interface RoomLimitAlert {
    title: string;
    message: string;
    clickUrl: string | null;
    clickUrlText: string | null;
}

/**
 * AIR (navigator IncomingMessages, CanCreateRoom): "${navigator.createroom.limitreached}" with the limit,
 * captioned "${navigator.createroom.error}". A VIP gets a plain alert; everyone else gets AIR's
 * ClubPromoAlertView, whose "${navigator.createroom.vippromo}" link opens Habbo Club.
 */
export const buildRoomLimitAlert = (roomLimit: number, hasVip: boolean): RoomLimitAlert => {
    const limit = String(roomLimit);

    return {
        title: localizeWithFallback('navigator.createroom.error', 'Room creation failed.'),
        message: localizeWithFallback('navigator.createroom.limitreached', `You have reached the limit of ${limit} rooms.`, ['limit'], [limit]),
        clickUrl: hasVip ? null : HC_CENTER_LINK,
        clickUrlText: hasVip ? null : localizeWithFallback('navigator.createroom.vippromo', 'HC members can have even more rooms! >>')
    };
};

/**
 * The server answers a create over the room limit with CanCreateRoom (count >= max) instead of
 * FlatCreated. Show AIR's message and hand the creator its lockout back.
 */
export const useRoomCreateLimitAlert = (hasVip: boolean, onLimitReached: () => void) => {
    const { simpleAlert = null } = useNotification();

    useMessageEvent<CanCreateRoomEvent>(CanCreateRoomEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.resultCode === ROOM_CREATE_ALLOWED) return;

        onLimitReached();

        const alert = buildRoomLimitAlert(parser.roomLimit, hasVip);

        simpleAlert?.(alert.message, null, alert.clickUrl, alert.clickUrlText, alert.title);
    });
};
