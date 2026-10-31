import { FC } from 'react';
import {
    GetConfigurationValue,
    getNavigatorLiftedImageUrl,
    INavigatorLiftedRoom,
    localizeServerText,
    localizeWithFallback,
    TryVisitRoom
} from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface NavigatorLiftedRoomsViewProps {
    rooms: ReadonlyArray<INavigatorLiftedRoom>;
}

/**
 * The navigator's lifted rooms (AIR LiftDataContainer): promoted rooms shown with their teaser image
 * (image.library.url + image, or the default nav_teaser_wl.png) at the top of the hotel view results.
 * A click goes to the room.
 */
export const NavigatorLiftedRoomsView: FC<NavigatorLiftedRoomsViewProps> = ({ rooms }) => {
    if (!rooms || !rooms.length) return null;

    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const label = localizeWithFallback('navigator.lifted.title', 'Featured rooms');

    return (
        <NativeTextTree>
            <section className="octane-navigator-lifted" aria-label={label}>
                <div className="octane-navigator-lifted__track">
                    {rooms.map((room, index) => (
                        <BaseButton
                            key={`${room.roomId}:${index}`}
                            className="octane-navigator-lifted__room"
                            aria-label={localizeServerText(room.caption) || label}
                            onClick={() => TryVisitRoom(room.roomId)}
                        >
                            <img alt="" className="octane-navigator-lifted__image" draggable={false} src={getNavigatorLiftedImageUrl(room, imageLibraryUrl)} />
                            {room.caption && <span className="octane-navigator-lifted__caption">{localizeServerText(room.caption)}</span>}
                        </BaseButton>
                    ))}
                </div>
            </section>
        </NativeTextTree>
    );
};
