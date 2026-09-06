import { GetRoomEngine, GetSessionDataManager, IRoomObject, RoomObjectCategory, RoomObjectVariable } from '@octane/renderer';
import { useState } from 'react';
import { GetRoomSession, LocalizeText, RoomObjectItem } from '../../../api';
import { useFurniAddedEvent, useFurniRemovedEvent } from '../engine';
import { useRoom } from '../useRoom';

const isPetOrBot = (roomObjectType: string): boolean =>
    roomObjectType.includes('pet_') ||
    roomObjectType.includes('bot_') ||
    roomObjectType === 'pet' ||
    roomObjectType === 'bot' ||
    roomObjectType.includes('rentableBot');

const buildWallItem = (roomObject: IRoomObject): RoomObjectItem | null => {
    if (roomObject.id < 0 || isPetOrBot(roomObject.type)) return null;

    const sessionDataManager = GetSessionDataManager();
    let name = roomObject.type;

    if (name.startsWith('poster')) {
        name = LocalizeText(`poster_${name.replace('poster', '')}_name`);
    } else {
        const typeId = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
        const furniData = sessionDataManager.getWallItemData(typeId);

        if (furniData && furniData.name.length) name = furniData.name;
    }

    const ownerId = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_OWNER_ID) || 0;
    const ownerName = roomObject.model.getValue<string>(RoomObjectVariable.FURNITURE_OWNER_NAME) || `User_${ownerId}`;

    return new RoomObjectItem(roomObject.id, RoomObjectCategory.WALL, name, ownerId, ownerName, 'furniture');
};

const buildFloorItem = (roomObject: IRoomObject): RoomObjectItem | null => {
    if (roomObject.id < 0 || isPetOrBot(roomObject.type)) return null;

    const sessionDataManager = GetSessionDataManager();
    let name = roomObject.type;

    const typeId = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
    const furniData = sessionDataManager.getFloorItemData(typeId);

    if (furniData && furniData.name.length) name = furniData.name;

    const ownerId = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_OWNER_ID) || 0;
    const ownerName = roomObject.model.getValue<string>(RoomObjectVariable.FURNITURE_OWNER_NAME) || `User_${ownerId}`;

    return new RoomObjectItem(roomObject.id, RoomObjectCategory.FLOOR, name, ownerId, ownerName, 'furniture');
};

/**
 * State + event subscriptions for the Furni chooser widget. Pure
 * imperative actions (selectItem) live in useFurniChooserActions.
 */
export const useFurniChooserState = () => {
    const [items, setItems] = useState<RoomObjectItem[]>(null);
    const { roomSession = null } = useRoom();

    const onClose = () => setItems(null);

    const populateChooser = () => {
        const wallObjects = GetRoomEngine().getRoomObjects(roomSession.roomId, RoomObjectCategory.WALL);
        const floorObjects = GetRoomEngine().getRoomObjects(roomSession.roomId, RoomObjectCategory.FLOOR);

        const wallItems = wallObjects.map(buildWallItem).filter((item): item is RoomObjectItem => item !== null);
        const floorItems = floorObjects.map(buildFloorItem).filter((item): item is RoomObjectItem => item !== null);

        setItems([...wallItems, ...floorItems].sort((a, b) => (a.name < b.name ? -1 : 1)));
    };

    useFurniAddedEvent(!!items, (event) => {
        if (event.id < 0) return;

        const roomObject = GetRoomEngine().getRoomObject(GetRoomSession().roomId, event.id, event.category);

        if (!roomObject) return;

        const item =
            event.category === RoomObjectCategory.WALL
                ? buildWallItem(roomObject)
                : event.category === RoomObjectCategory.FLOOR
                  ? buildFloorItem(roomObject)
                  : null;

        if (item) setItems((prevValue) => [...(prevValue ?? []), item].sort((a, b) => (a.name < b.name ? -1 : 1)));
    });

    useFurniRemovedEvent(!!items, (event) => {
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
