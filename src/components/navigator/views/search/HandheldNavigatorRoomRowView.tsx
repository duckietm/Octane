import { RoomDataParser } from '@octane/renderer';
import { FC, MouseEvent, useId, useState } from 'react';
import { FaChevronDown, FaSignInAlt } from 'react-icons/fa';
import { localizeWithFallback } from '../../../../api';
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
    stripe?: boolean;
    onVisit: (event: MouseEvent) => void;
}

/**
 * Phone navigator: a room as one tall row (picture, name, owner, users). A tap opens the room's card under
 * it (description, tags, a large "go to room" button and the full info), so a finger that only meant to
 * look never walks into a room; a second tap folds it again.
 */
export const HandheldNavigatorRoomRowView: FC<HandheldNavigatorRoomRowViewProps> = (props) => {
    const { roomData, title, doorClassName, stripe = false, onVisit } = props;
    const [isOpen, setIsOpen] = useState(false);
    const detailsId = useId();
    const owner = roomData.showOwner && roomData.ownerName ? roomData.ownerName : '';
    const tags = (roomData.tags ?? []).filter((tag) => !!tag);

    return (
        <NativeTextTree>
            <div className={`octane-handheld-room${isOpen ? ' is-open' : ''}${stripe ? ' is-stripe' : ''}`}>
                <BaseButton
                    aria-controls={isOpen ? detailsId : undefined}
                    aria-expanded={isOpen}
                    aria-label={title}
                    className="octane-handheld-room__summary"
                    onClick={() => setIsOpen((value) => !value)}
                >
                    <LayoutRoomThumbnailView className="octane-handheld-room__thumb" customUrl={roomData.officialRoomPicRef} roomId={roomData.roomId} />
                    <span className="octane-handheld-room__text">
                        <span className="octane-handheld-room__name">{title}</span>
                        {!!owner && <span className="octane-handheld-room__owner">{owner}</span>}
                    </span>
                    <span className="octane-handheld-room__status">
                        <NavigatorUserCountView maxUserCount={roomData.maxUserCount} userCount={roomData.userCount} />
                        {!!doorClassName && <i aria-hidden="true" className={doorClassName} />}
                        {roomData.habboGroupId > 0 && <i aria-hidden="true" className="octane-navigator-air__group" />}
                    </span>
                    <FaChevronDown aria-hidden="true" className="octane-handheld-room__arrow" />
                </BaseButton>
                {isOpen && (
                    <div className="octane-handheld-room__details" id={detailsId} role="region" aria-label={localizeWithFallback('octane.handheld.navigator.details', 'Room details')}>
                        {!!roomData.description && <p className="octane-handheld-room__description">{roomData.description}</p>}
                        {tags.length > 0 && (
                            <ul className="octane-handheld-room__tags">
                                {tags.map((tag) => (
                                    <li key={tag} className="octane-handheld-room__tag">
                                        {tag}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="octane-handheld-room__actions">
                            <BaseButton className="octane-handheld-room__enter" onClick={onVisit}>
                                <FaSignInAlt aria-hidden="true" />
                                <span>{localizeWithFallback('octane.handheld.navigator.enter', 'Go to room')}</span>
                            </BaseButton>
                            <NavigatorSearchResultItemInfoView roomData={roomData} />
                        </div>
                    </div>
                )}
            </div>
        </NativeTextTree>
    );
};
