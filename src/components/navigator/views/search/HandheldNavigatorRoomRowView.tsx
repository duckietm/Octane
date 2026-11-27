import { RoomDataParser } from '@octane/renderer';
import { CSSProperties, FC, MouseEvent } from 'react';
import { getNavigatorUserCountLevel } from '../../../../api';
import { LayoutRoomThumbnailView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { NavigatorSearchResultItemInfoView } from './NavigatorSearchResultItemInfoView';

export interface HandheldNavigatorRoomRowViewProps {
    roomData: RoomDataParser;
    title: string;
    /** The door icon class of the room ('' for an open room). */
    doorClassName: string;
    /** Without the room picture: the short card of the list view. */
    compact?: boolean;
    onVisit: (event: MouseEvent) => void;
}

/** The share of the room's places that are taken, 0 to 100. */
const occupancy = (userCount: number, maxUserCount: number): number => Math.max(0, Math.min(100, Math.round((100 * userCount) / maxUserCount)));

/**
 * Phone navigator: a room as one card. Its large left part (picture, name, owner, users) is one button
 * that enters the room; the "i" at its right end is a separate button for the room's info, so both are
 * easy to hit and neither is in the way of scrolling the list. How full the room is reads from the meter:
 * a dot and a bar in the level's colour around the head count (a room without a limit has no bar).
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
                            <span className="octane-handheld-room__meter" data-level={getNavigatorUserCountLevel(roomData.userCount, roomData.maxUserCount)}>
                                <i aria-hidden="true" className="octane-handheld-room__meter-dot" />
                                <span className="octane-handheld-room__meter-count">{roomData.userCount}</span>
                                {roomData.maxUserCount > 0 && (
                                    <i aria-hidden="true" className="octane-handheld-room__meter-bar" style={{ '--hh-fill': `${occupancy(roomData.userCount, roomData.maxUserCount)}%` } as CSSProperties} />
                                )}
                            </span>
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
