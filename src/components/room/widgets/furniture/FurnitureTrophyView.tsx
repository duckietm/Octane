import { FC } from 'react';
import { LayoutTrophyView } from '../../../../common';
import { useFurnitureTrophyWidget } from '../../../../hooks';
import '../../../../css/room/FurniWindowsAAir.css';

/** Official `TrophyFurniWidget.updateInterface`: the trophy card (the Niko app's trophy views are not part of this client). */
export const FurnitureTrophyView: FC<{}> = (props) => {
    const { objectId = -1, color = '1', senderName = '', date = '', message = '', onClose = null } = useFurnitureTrophyWidget();

    if (objectId === -1) return null;

    return <LayoutTrophyView color={color} date={date} message={message} senderName={senderName} onCloseClick={onClose} />;
};
