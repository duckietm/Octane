import {
    GetRoomEngine,
    GetSessionDataManager,
    RoomEngineTriggerWidgetEvent,
    RoomObjectCategory,
    RoomObjectVariable,
    RoomSessionPresentEvent
} from '@octane/renderer';
import { useState } from 'react';
import { useOctaneEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';
import { useRoom } from '../../useRoom';

/** `EcotronBoxFurniWidget._interfaceMapByFurniTypeName`: the furni-matic box has its own card. */
export const ECOTRON_BOX_VARIANT_ECOTRON = 'ecotron';
export const ECOTRON_BOX_VARIANT_FURNIMATIC = 'furnimatic';

export const getEcotronBoxVariant = (className: string): string => (className === 'matic_box' ? ECOTRON_BOX_VARIANT_FURNIMATIC : ECOTRON_BOX_VARIANT_ECOTRON);

/**
 * `FurnitureEcotronBoxWidgetHandler` + `EcotronBoxFurniWidget`: the recycler box card with its
 * date line and an Open button for the room owner / a moderator. Opening goes through the same
 * present-open message as a gift; the contents are then shown by the gift-opening widget, which
 * receives the present-opened event as well, so this card only steps aside.
 */
const useFurnitureEcotronBoxWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [text, setText] = useState('');
    const [variant, setVariant] = useState(ECOTRON_BOX_VARIANT_ECOTRON);
    const [isController, setIsController] = useState(false);
    const [isOpening, setIsOpening] = useState(false);
    const { roomSession = null } = useRoom();

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setText('');
        setVariant(ECOTRON_BOX_VARIANT_ECOTRON);
        setIsController(false);
        setIsOpening(false);
    };

    /** `EcotronBoxFurniWidget.sendOpen`: once, and only for a controller. */
    const openBox = () => {
        if (isOpening || objectId === -1 || !isController || !roomSession) return;

        setIsOpening(true);
        roomSession.openGift(objectId);
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_ECOTRONBOX, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        const data = roomObject.model.getValue<string>(RoomObjectVariable.FURNITURE_DATA);

        // the handler drops a box without data
        if (data === null || data === undefined) return;

        const typeId = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
        const furniData = GetSessionDataManager().getFloorItemData(typeId);

        setObjectId(event.objectId);
        setCategory(event.category);
        setText(data);
        setVariant(getEcotronBoxVariant(furniData ? furniData.className : ''));
        setIsController(!!(roomSession && roomSession.isRoomOwner) || !!GetSessionDataManager().isModerator);
        setIsOpening(false);
    });

    // A gift card opening elsewhere replaces this one (RWPDUE_PACKAGEINFO hides the ecotron card).
    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_PRESENT, () => {
        if (objectId !== -1) onClose();
    });

    // The box we asked to open answered: the gift-opening widget shows what was inside.
    useOctaneEvent<RoomSessionPresentEvent>(RoomSessionPresentEvent.RSPE_PRESENT_OPENED, () => {
        if (isOpening) onClose();
    });

    useFurniRemovedEvent(objectId !== -1, (event) => {
        if (event.id !== objectId || event.category !== category) return;

        // while opening, the removal of the box precedes the present-opened event
        if (!isOpening) onClose();
    });

    return { objectId, category: category === -1 ? RoomObjectCategory.FLOOR : category, text, variant, isController, isOpening, openBox, onClose };
};

export const useFurnitureEcotronBoxWidget = useFurnitureEcotronBoxWidgetState;
