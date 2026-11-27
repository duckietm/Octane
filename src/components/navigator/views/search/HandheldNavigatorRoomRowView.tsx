import { RoomDataParser } from '@octane/renderer';
import { FC, MouseEvent } from 'react';
import { LayoutRoomThumbnailView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { NavigatorSearchResultItemInfoView } from './NavigatorSearchResultItemInfoView';
import { NavigatorUserCountView } from './NavigatorUserCountView';

export interface HandheldNavigatorRoomRowViewProps {
    roomData: RoomDataParser;
    title: string;
    /** The door icon class of the room ('' for an open room). */
    doorClassName: string;
    /** Without the room picture: the short card of the list view. */
    compact?: boolean;
    onVisit: (event: MouseEvent) => void;
}

/**
 * Phone navigator: a room as one card. Its large left part (picture, name, owner, users) is one button
 * that enters the room; the "i" at its right end is a separate button for the room's info, so both are
 * easy to hit and neither is in the way of scrolling the list.
 */
export const HandheldNavigatorRoomRowView: FC<HandheldNavigatorRoomRowViewProps> = (props) => {
    const { roomData, title, doorClassName, compact = false, onVisit } = props;
    const owner = roomData.showOwner && roomData.ownerName ? roomData.ownerName : '';

    return (
        <NativeTextTree>
            <div className={`octane-handheld-room${compact ? ' is-compact' : ''}`}>
                <BaseButton aria-label={title} className="octane-handheld-room__enter" onClick={onVisit}>
                    {!compact && <LayoutRoomThumbnailView className="octane-handheld-room__thumb" customUrl={roomData.officialRoomPicRef} roomId={roomData.roomId} />}
                    <span className="octane-handheld-room__text">
                        <span className="octane-handheld-room__name">{title}</span>
                        {!!owner && <span className="octane-handheld-room__owner">{owner}</span>}
                        <span className="octane-handheld-room__status">
                            <NavigatorUserCountView maxUserCount={roomData.maxUserCount} userCount={roomData.userCount} />
                            {!!doorClassName && <i aria-hidden="true" className={doorClassName} />}
                            {roomData.habboGroupId > 0 && <i aria-hidden="true" className="octane-navigator-air__group" />}
                        </span>
                    </span>
                </BaseButton>
                <NavigatorSearchResultItemInfoView handheld roomData={roomData} />
            </div>
        </NativeTextTree>
    );
};
