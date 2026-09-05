import { GetRoomEngine } from '@octane/renderer';
import { GetRoomSession, RoomObjectItem } from '../../../api';

/**
 * Imperative actions for the User chooser. Stateless — split from
 * useUserChooserState so components that only need to dispatch a
 * selection don't subscribe to the user-add/remove lifecycle events.
 */
export const useUserChooserActions = () => ({
    selectItem: (item: RoomObjectItem): void => {
        if (!item) return;

        GetRoomEngine().selectRoomObject(GetRoomSession().roomId, item.id, item.category);
    }
});
