import type { OfficialRoomEntryData } from '@octane/renderer';
import { FC, useEffect, useMemo } from 'react';
import { CreateLinkEvent, GetConfigurationValue, LocalizeText, TryVisitRoom } from '../../../api';
import { Text } from '../../../common';
import {
    getRoomThumbnailUrl,
    getVisibleOfficialRoomEntries,
    OFFICIAL_ROOM_TYPE_FOLDER,
    OFFICIAL_ROOM_TYPE_GUEST_ROOM,
    OFFICIAL_ROOM_TYPE_TAG,
    useOfficialRooms
} from '../../../hooks';

const resolveEntryImage = (entry: OfficialRoomEntryData): string => {
    if (entry.picRef) return `${GetConfigurationValue<string>('image.library.url', '')}${entry.picRef}`;

    const room = entry.guestRoomData;

    if (!room) return '';

    return getRoomThumbnailUrl({
        roomId: room.roomId,
        officialRoomPicRef: room.officialRoomPicRef,
        imageLibraryUrl: GetConfigurationValue<string>('image.library.url', ''),
        thumbnailsUrl: GetConfigurationValue<string>('thumbnails.url', '')
    });
};

/**
 * AIR 13 official rooms list (`OfficialRoomListCtrl` / `OfficialRoomEntryManager`
 * + `OfficialRooms`, header 438). A folder row toggles its children open, a
 * guest-room row shows the banner, the description and an enter button, and a
 * tag row starts the official tag search. The promoted-rooms block is rendered
 * on top, as `PromotedRoomsListCtrl` does.
 */
export const NavigatorOfficialRoomsView: FC<{}> = (props) => {
    const { entries = [], adRoom = null, promotedRooms = [], openFolderIndexes, loaded, requestOfficialRooms, toggleFolder } = useOfficialRooms();

    useEffect(() => {
        if (!loaded) requestOfficialRooms(0);
    }, [loaded, requestOfficialRooms]);

    const visibleEntries = useMemo(
        () => getVisibleOfficialRoomEntries(adRoom ? [adRoom, ...entries] : entries, openFolderIndexes ?? new Set<number>()),
        [entries, adRoom, openFolderIndexes]
    );

    if (!visibleEntries.length && !promotedRooms.length) return null;

    const enterEntry = (entry: OfficialRoomEntryData) => {
        if (entry.type === OFFICIAL_ROOM_TYPE_GUEST_ROOM && entry.guestRoomData) {
            TryVisitRoom(entry.guestRoomData.roomId);

            return;
        }

        if (entry.type === OFFICIAL_ROOM_TYPE_TAG && entry.tag) {
            CreateLinkEvent(`navigator/search/tag/${entry.tag}`);

            return;
        }

        toggleFolder(entry.index);
    };

    return (
        <div className="octane-navigator-official" data-testid="navigator-official-rooms">
            {promotedRooms.length > 0 && (
                <div className="octane-navigator-official__promoted">
                    {promotedRooms.map((folder) => (
                        <button
                            key={folder.code}
                            type="button"
                            className="octane-navigator-official__promoted-room"
                            onClick={() => folder.bestRoom && TryVisitRoom(folder.bestRoom.roomId)}
                        >
                            <Text bold>{folder.bestRoom?.roomName ?? folder.code}</Text>
                            <Text small variant="muted">
                                {folder.bestRoom?.userCount ?? 0}
                            </Text>
                        </button>
                    ))}
                </div>
            )}
            {visibleEntries.map((entry) => {
                const isFolder = entry.type === OFFICIAL_ROOM_TYPE_FOLDER;
                const isOpen = isFolder && (openFolderIndexes?.has(entry.index) ?? false);
                const image = resolveEntryImage(entry);

                return (
                    <div
                        key={`${entry.index}-${entry.folderId}`}
                        className={`octane-navigator-official__row${isFolder ? ' octane-navigator-official__row--folder' : ''}`}
                    >
                        {image && <img className="octane-navigator-official__image" src={image} alt="" />}
                        <div className="octane-navigator-official__body">
                            <Text bold>{entry.popupCaption}</Text>
                            {entry.showDetails && entry.popupDesc && (
                                <Text small variant="muted">
                                    {entry.popupDesc}
                                </Text>
                            )}
                            {!entry.showDetails && entry.picText && <Text small>{entry.picText}</Text>}
                            {entry.type === OFFICIAL_ROOM_TYPE_GUEST_ROOM && (
                                <Text small variant="muted">
                                    {entry.userCount}
                                </Text>
                            )}
                        </div>
                        <button type="button" className="octane-navigator-official__enter" onClick={() => enterEntry(entry)}>
                            {isFolder ? LocalizeText(isOpen ? 'navigator.folder.hide' : 'navigator.folder.show') : LocalizeText('navigator.tooltip.go.to.room')}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
