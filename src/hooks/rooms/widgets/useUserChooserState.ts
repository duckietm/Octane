import { GetRoomEngine, RoomObjectCategory } from '@octane/renderer';
import { useState } from 'react';
import { GetRoomSession, RoomObjectItem } from '../../../api';
import { useUserAddedEvent, useUserRemovedEvent } from '../engine';
import { getUserChooserType } from './userChooser.helpers';

// The official user chooser lists users, pets and bots and lets the type
// dropdown narrow the list; the type is kept on the item for that filter.
const buildUserItem = (roomIndex: number): RoomObjectItem | null => {
    if (roomIndex < 0) return null;

    const userData = GetRoomSession()?.userDataManager?.getUserDataByIndex(roomIndex);

    if (!userData) return null;

    const type = getUserChooserType(userData.type);

    if (!type) return null;

    return new RoomObjectItem(userData.roomIndex, RoomObjectCategory.UNIT, userData.name, 0, '-', type);
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

        if (!session) return;

        const roomObjects = GetRoomEngine().getRoomObjects(session.roomId, RoomObjectCategory.UNIT);

        setItems(
            roomObjects
                .map((roomObject) => buildUserItem(roomObject.id))
                .filter((item): item is RoomObjectItem => item !== null)
                .sort((a, b) => (a.name < b.name ? -1 : 1))
        );
    };

    useUserAddedEvent(!!items, (event) => {
        const item = buildUserItem(event.id);

        if (!item) return;

        setItems((prevValue) => {
            const newValue = [...(prevValue ?? []), item];
            newValue.sort((a, b) => (a.name < b.name ? -1 : 1));
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
