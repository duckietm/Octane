import { FC } from 'react';
import { LayoutTrophyView } from '../../../../common';
import { TROPHY_VIEW_NIKO_GOLD, TROPHY_VIEW_NIKO_SILVER, useFurnitureTrophyWidget } from '../../../../hooks';
import { FurnitureNikoTrophyView } from './FurnitureNikoTrophyView';

/** Official `TrophyFurniWidget.updateInterface`: the Niko views open `NikoTrophyView`, everything else the trophy card. */
export const FurnitureTrophyView: FC<{}> = (props) => {
    const { objectId = -1, color = '1', senderName = '', date = '', message = '', view = 0, onClose = null } = useFurnitureTrophyWidget();

    if (objectId === -1) return null;

    if (view === TROPHY_VIEW_NIKO_GOLD || view === TROPHY_VIEW_NIKO_SILVER) return <FurnitureNikoTrophyView date={date} view={view} onClose={onClose} />;

    return <LayoutTrophyView color={color} date={date} message={message} senderName={senderName} onCloseClick={onClose} />;
};
