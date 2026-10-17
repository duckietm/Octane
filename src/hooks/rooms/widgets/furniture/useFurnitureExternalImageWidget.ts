import { GetRoomEngine, RoomEngineTriggerWidgetEvent, RoomObjectCategory, RoomObjectVariable } from '@octane/renderer';
import { useState } from 'react';
import { getCameraPhotoCreatorId, IPhotoData } from '../../../../api';
import { useOctaneEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';
import { useRoom } from '../../useRoom';

/** A photo's stored data, or null when it is not valid JSON (a broken item must not stop the viewer). */
export const parsePhotoData = (data: string): IPhotoData | null => {
    if (!data) return null;

    try {
        const parsed = JSON.parse(data);

        return parsed && typeof parsed === 'object' ? (parsed as IPhotoData) : null;
    } catch {
        return null;
    }
};

export interface IPhotoCreator {
    id: number;
    name: string;
}

/**
 * Who took the photo. Official data names the creator (`n`, id `s`); our server stores the room id in
 * `s` and no name, so the id then comes from the file name (`<userId>_<ts>.png`) or the owner fields,
 * and the name only from the wall item's owner when that is the same user.
 */
export const getPhotoCreator = (photo: IPhotoData, ownerId: number = 0, ownerName: string = ''): IPhotoCreator => {
    if (!photo) return { id: 0, name: '' };

    if (photo.n) return { id: Number(photo.s ?? photo.oi ?? 0) || 0, name: photo.n };

    const fileCreatorId = getCameraPhotoCreatorId(photo.w);
    const namedOwnerId = Number(photo.oi ?? 0) || 0;

    if (photo.o && namedOwnerId && (!fileCreatorId || fileCreatorId === namedOwnerId)) return { id: namedOwnerId, name: photo.o };

    const id = fileCreatorId || namedOwnerId;

    return { id, name: id && id === ownerId ? (ownerName ?? '') : '' };
};

const useFurnitureExternalImageWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(-1);
    const [currentPhotos, setCurrentPhotos] = useState<IPhotoData[]>([]);
    // The wall item behind each photo, in the same order: report and remove act on the one shown.
    const [currentObjectIds, setCurrentObjectIds] = useState<number[]>([]);
    const { roomSession = null } = useRoom();

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setCurrentPhotoIndex(-1);
        setCurrentPhotos([]);
        setCurrentObjectIds([]);
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_EXTERNAL_IMAGE, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        // Official: browsing cycles the wall items of the clicked item's type only.
        const roomTotalImages = GetRoomEngine().getRoomObjects(roomSession?.roomId ?? event.roomId, RoomObjectCategory.WALL) ?? [];
        const datas: IPhotoData[] = [];
        const objectIds: number[] = [];

        roomTotalImages.forEach((object) => {
            if (object.type !== roomObject.type) return;

            const jsonData = parsePhotoData(object.model.getValue<string>(RoomObjectVariable.FURNITURE_DATA));

            if (!jsonData) return;

            datas.push(jsonData);
            objectIds.push(object.id);
        });

        // The photo that was clicked: by its wall item first, then by its photo id.
        let index = objectIds.indexOf(event.objectId);

        if (index < 0) {
            const roomObjectPhotoData = parsePhotoData(roomObject.model.getValue<string>(RoomObjectVariable.FURNITURE_DATA));

            index = roomObjectPhotoData ? datas.findIndex((data) => data.u === roomObjectPhotoData.u) : -1;
        }

        // A clicked item without readable photo data has nothing to show.
        if (index < 0) {
            onClose();
            return;
        }

        setObjectId(event.objectId);
        setCategory(event.category);
        setCurrentPhotos(datas);
        setCurrentObjectIds(objectIds);
        setCurrentPhotoIndex(index);
    });

    useFurniRemovedEvent(objectId !== -1 && category !== -1, (event) => {
        if (event.category !== category) return;

        const shownObjectId = currentObjectIds[currentPhotoIndex] ?? objectId;

        if (event.id !== shownObjectId) return;

        onClose();
    });

    return { objectId, currentPhotoIndex, setCurrentPhotoIndex, currentPhotos, currentObjectIds, onClose };
};

export const useFurnitureExternalImageWidget = useFurnitureExternalImageWidgetState;
