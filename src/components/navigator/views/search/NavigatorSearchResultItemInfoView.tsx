import { RoomDataParser } from '@octane/renderer';
import { FC, MouseEvent, useRef } from 'react';
import { LocalizeText } from '../../../../api';
import { useNavigatorRoomInfoPopupStore } from '../../../../hooks';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface NavigatorSearchResultItemInfoViewProps {
    roomData: RoomDataParser;
    thumbnail?: boolean;
    /** Phone layout: the large touch button of a room card; the info it opens stays until it is closed. */
    handheld?: boolean;
}

export const NavigatorSearchResultItemInfoView: FC<NavigatorSearchResultItemInfoViewProps> = (props) => {
    const { roomData = null, thumbnail = false, handheld = false } = props;
    const elementRef = useRef<HTMLButtonElement>(null);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!elementRef.current) return;
        useNavigatorRoomInfoPopupStore.getState().toggleFromInfo(roomData, elementRef.current.getBoundingClientRect());
        // No pointer hovers a touch screen, so the info would fade away on its timer while it is being read.
        if (handheld) useNavigatorRoomInfoPopupStore.getState().setHovered(true);
    };

    const handleMouseEnter = () => {
        if (!elementRef.current) return;
        useNavigatorRoomInfoPopupStore.getState().retargetIfVisible(roomData, thumbnail ? 'tile' : 'info', elementRef.current.getBoundingClientRect());
    };

    return (
        <NativeTextTree>
            <BaseButton
                type="button"
                ref={elementRef}
                className={handheld ? 'octane-handheld-room__info' : 'octane-navigator-air__room-info'}
                aria-label={LocalizeText('navigator.room.popup.room.info')}
                onClick={handleClick}
                onMouseEnter={handheld ? undefined : handleMouseEnter}
            />
        </NativeTextTree>
    );
};
