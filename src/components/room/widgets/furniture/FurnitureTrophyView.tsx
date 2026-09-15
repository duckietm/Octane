import { FC } from 'react';
import { LayoutTrophyView } from '../../../../common';
import { useFurnitureTrophyWidget } from '../../../../hooks';
import { FurnitureNikoTrophyView, isNikoTrophyView } from './FurnitureNikoTrophyView';

export const FurnitureTrophyView: FC<{}> = (props) => {
    const { objectId = -1, color = '1', senderName = '', date = '', message = '', viewType = 0, onClose = null } = useFurnitureTrophyWidget();

    if (objectId === -1) return null;

    // TrophyFurniWidget.updateInterface: the Niko views replace the general trophy card
    if (isNikoTrophyView(viewType)) return <FurnitureNikoTrophyView date={date} viewType={viewType} onClose={onClose} />;

    return <LayoutTrophyView color={color} date={date} message={message} senderName={senderName} onCloseClick={onClose} />;
};
