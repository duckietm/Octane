import { GetRoomEngine, RoomObjectCategory } from '@octane/renderer';
import { useState } from 'react';
import { CanOpenUserChooser, GetRoomSession, RoomObjectItem } from '../../../api';
import { useUserAddedEvent, useUserRemovedEvent } from '../engine';

/** AIR ChooserItem order (UserChooserWidgetHandler.compareItems): names compared upper-cased. */
const compareItems = (a: RoomObjectItem, b: RoomObjectItem) => (a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1);

/**
 * AIR UserChooserWidgetHandler.handleUserChooserRequest: every room unit with user data (Habbos, pets and both
 * bot kinds), with its user type kept as the type the table localizes (`new_user_chooser.usertype.<type>`).
 */
const buildUserItem = (roomIndex: number): RoomObjectItem | null => {
    if (roomIndex < 0) return null;

    const userData = GetRoomSession()?.userDataManager?.getUserDataByIndex(roomIndex);

    if (!userData) return null;

    return new RoomObjectItem(userData.roomIndex, RoomObjectCategory.UNIT, userData.name, 0, '-', String(userData.type));
};

/**
 * State + event subscriptions for the User chooser widget. Pure
 * imperative actions (selectItem) live in useUserChooserActions.
 */
export const useUserChooserState = () => {
    const [items, setItems] = useState<RoomObjectItem[]>(null);

    const onClose = () => setItems(null);

    const populateChooser = () => {
        const session = GetRoomSession();

        if (!session || !CanOpenUserChooser(session)) return;

        const roomObjects = GetRoomEngine().getRoomObjects(session.roomId, RoomObjectCategory.UNIT);

        setItems(
            roomObjects
                .map((roomObject) => buildUserItem(roomObject.id))
                .filter((item): item is RoomObjectItem => item !== null)
                .sort(compareItems)
        );
    };

    useUserAddedEvent(!!items, (event) => {
        const item = buildUserItem(event.id);

        if (!item) return;

        setItems((prevValue) => {
            const newValue = [...(prevValue ?? []), item];
            newValue.sort(compareItems);
            return newValue;
        });
    });

    useUserRemovedEvent(!!items, (event) => {
        if (event.id < 0) return;

        setItems((prevValue) => {
            if (!prevValue) return prevValue;

            const newValue = [...prevValue];

            for (let i = 0; i < newValue.length; i++) {
                const existingValue = newValue[i];

                if (existingValue.id !== event.id || existingValue.category !== event.category) continue;

                newValue.splice(i, 1);
                break;
            }

            return newValue;
        });
    });

    return { items, onClose, populateChooser };
};
