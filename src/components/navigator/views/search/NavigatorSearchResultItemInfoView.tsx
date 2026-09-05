import { RoomDataParser } from '@octane/renderer';
import { FC, MouseEvent, useRef } from 'react';
import { LocalizeText } from '../../../../api';
import { useNavigatorRoomInfoPopupStore } from '../../../../hooks';

interface NavigatorSearchResultItemInfoViewProps {
    roomData: RoomDataParser;
    thumbnail?: boolean;
}

export const NavigatorSearchResultItemInfoView: FC<NavigatorSearchResultItemInfoViewProps> = (props) => {
    const { roomData = null, thumbnail = false } = props;
    const elementRef = useRef<HTMLButtonElement>(null);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!elementRef.current) return;
        useNavigatorRoomInfoPopupStore.getState().toggleFromInfo(roomData, elementRef.current.getBoundingClientRect());
    };

    const handleMouseEnter = () => {
        if (!elementRef.current) return;
        useNavigatorRoomInfoPopupStore.getState().retargetIfVisible(roomData, thumbnail ? 'tile' : 'info', elementRef.current.getBoundingClientRect());
    };

    return (
        <button
            type="button"
            ref={elementRef}
            className="octane-navigator-air__room-info"
            aria-label={LocalizeText('navigator.room.popup.room.info')}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
        />
    );
};
