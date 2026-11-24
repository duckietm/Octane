import { GetRoomEngine, GetSessionDataManager, IFurnitureData, RoomEngineTriggerWidgetEvent, RoomObjectVariable, RoomSessionPresentEvent } from '@octane/renderer';
import { useRef, useState } from 'react';
import { GetRoomSession, IsAnyRoomController, ProductTypeEnum } from '../../../../api';
import { useOctaneEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';

/** Official `EcotronBoxFurniWidget._interfaceMapByFurniTypeName`: the furnimatic box has its own card. */
/** The official product type of a chat style prize; the present-opened class id is then the style's id. */
export const CHAT_STYLE_PRIZE_TYPE = 'chat_style';

export const ECOTRONBOX_CARD = 'ecotronbox_card';
export const ECOTRONBOX_CARD_FURNIMATIC = 'ecotronbox_card_furnimatic';

export const getEcotronBoxCard = (furniTypeName: string): string => (furniTypeName === 'matic_box' ? ECOTRONBOX_CARD_FURNIMATIC : ECOTRONBOX_CARD);

/**
 * Official `EcotronBoxFurniWidget` + its handler: double clicking an Ecotron box opens a small card with
 * the date the box was made (its stuff data), a message and, for the room owner or any room controller,
 * an "Open" button. Opening sends the present open packet; the `PresentOpened` answer turns the card into
 * the prize preview (icon + name) without the button. Another present card, or the box leaving the room
 * while it is not being opened, closes the card.
 */
const useFurnitureEcotronBoxWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [furniTypeName, setFurniTypeName] = useState('ecotron_box');
    const [date, setDate] = useState('');
    const [isController, setIsController] = useState(false);
    const [prizeName, setPrizeName] = useState<string>(null);
    const [prizeImageUrl, setPrizeImageUrl] = useState<string>(null);
    const [prizeChatStyleId, setPrizeChatStyleId] = useState(0);
    const openingRef = useRef(false);

    const onClose = () => {
        openingRef.current = false;
        setObjectId(-1);
        setDate('');
        setIsController(false);
        setPrizeName(null);
        setPrizeImageUrl(null);
        setPrizeChatStyleId(0);
    };

    const open = () => {
        if (openingRef.current || objectId === -1 || !isController) return;

        const roomSession = GetRoomSession();

        if (!roomSession) return;

        openingRef.current = true;
        roomSession.openGift(objectId);
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_ECOTRONBOX, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);
        const model = roomObject?.model;

        if (!model) return;

        const data = model.getValue<string>(RoomObjectVariable.FURNITURE_DATA);

        if (data === null || data === undefined) return;

        const typeId = model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
        const roomSession = GetRoomSession();

        onClose();
        setObjectId(event.objectId);
        setDate(data);
        setFurniTypeName(GetSessionDataManager().getFloorItemData(typeId)?.className ?? '');
        setIsController(!!roomSession?.isRoomOwner || IsAnyRoomController());
    });

    // Official: the present card replaces the Ecotron card.
    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_PRESENT, () => {
        if (objectId !== -1) onClose();
    });

    useOctaneEvent<RoomSessionPresentEvent>(RoomSessionPresentEvent.RSPE_PRESENT_OPENED, (event) => {
        if (!openingRef.current) return;

        let furniData: IFurnitureData = null;
        let imageUrl: string = null;

        if (event.itemType === ProductTypeEnum.FLOOR) {
            furniData = GetSessionDataManager().getFloorItemData(event.classId);
            imageUrl = GetRoomEngine().getFurnitureFloorIconUrl(event.classId);
        } else if (event.itemType === ProductTypeEnum.WALL) {
            furniData = GetSessionDataManager().getWallItemData(event.classId);
            imageUrl = GetRoomEngine().getFurnitureWallIconUrl(event.classId);
        }

        // A chat style prize (product type chat_style, the class id its style): named from its product data.
        const chatStyleId = event.itemType === CHAT_STYLE_PRIZE_TYPE ? event.classId : 0;

        setDate('');
        setPrizeName(chatStyleId ? (GetSessionDataManager().getProductData(`chat_bubble_${chatStyleId}`)?.name ?? '') : (furniData?.name ?? ''));
        setPrizeImageUrl(imageUrl);
        setPrizeChatStyleId(chatStyleId);
    });

    useFurniRemovedEvent(objectId !== -1, (event) => {
        if (event.id !== objectId) return;

        // Official `hideInterface` keeps the box while it is being opened, so the prize still shows.
        if (openingRef.current) return;

        onClose();
    });

    return {
        objectId,
        card: getEcotronBoxCard(furniTypeName),
        date,
        prizeName,
        prizeImageUrl,
        prizeChatStyleId,
        canOpen: isController && prizeName === null,
        open,
        onClose
    };
};

export const useFurnitureEcotronBoxWidget = useFurnitureEcotronBoxWidgetState;
