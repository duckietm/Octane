import { GetRoomEngine, RoomObjectCategory } from '@octane/renderer';
import { useState } from 'react';
import { GetRoomSession, RoomObjectItem } from '../../../api';
import { useUserAddedEvent, useUserRemovedEvent } from '../engine';

const resolveUserType = (userType: number): string => {
    switch (userType) {
        case 1:
            return 'Habbo';
        case 2:
            return 'Pet';
        case 3:
            return 'Bot';
        default:
            return '-';
    }
};

const buildUserItem = (roomIndex: number): RoomObjectItem | null => {
    if (roomIndex < 0) return null;

    const userData = GetRoomSession()?.userDataManager?.getUserDataByIndex(roomIndex);

    if (!userData) return null;
    if (userData.type !== 1) return null;

    return new RoomObjectItem(userData.roomIndex, RoomObjectCategory.UNIT, userData.name, 0, '-', resolveUserType(userData.type));
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
