import { GetRoomEngine } from '@octane/renderer';
import { GetRoomSession, RoomObjectItem } from '../../../api';

/**
 * Imperative actions for the Furni chooser. Stateless — split from
 * useFurniChooserState so components that only need to dispatch a
 * selection don't subscribe to the room-object lifecycle events.
 */
export const useFurniChooserActions = () => ({
    selectItem: (item: RoomObjectItem): void => {
        if (!item) return;

        GetRoomEngine().selectRoomObject(GetRoomSession().roomId, item.id, item.category);
    }
});
