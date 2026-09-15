import { CreateLinkEvent, GetGuestRoomResultEvent } from '@octane/renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue } from '../../../../api';
import { useMessageEvent, useRoom } from '../../../../hooks';

interface RoomEnterInfo {
    roomId: number;
    roomName: string;
    ownerName: string;
    tags: string[];
}

// The official panel shows at most two tags, each cut at sixteen characters
// (RoomToolsInfoCtrl.as, trimTag).
const MAX_TAGS = 2;
const TAG_MAX_LENGTH = 16;
const DEFAULT_COLLAPSE_DELAY_MS = 5000;

export const trimRoomInfoTag = (tag: string): string => (tag.length > TAG_MAX_LENGTH ? `${tag.slice(0, TAG_MAX_LENGTH)}...` : tag);

/**
 * The strip that slides out beside the room tools when a room is entered:
 * room name, owner and the first two tags. It collapses on its own after the
 * configured delay unless the pointer rests on it, and any click closes it.
 */
export const RoomToolsInfoView: FC<{ isToolsOpen: boolean }> = ({ isToolsOpen }) => {
    const [info, setInfo] = useState<RoomEnterInfo>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const collapseTimer = useRef<number | null>(null);
    const { roomSession = null } = useRoom();

    const enabled = GetConfigurationValue<boolean>('room.enter.info.enabled', true);
    const collapseDelay = GetConfigurationValue<number>('room.enter.info.collapse.delay', DEFAULT_COLLAPSE_DELAY_MS);

    const clearCollapseTimer = () => {
        if (collapseTimer.current === null) return;

        window.clearTimeout(collapseTimer.current);
        collapseTimer.current = null;
    };

    const collapseAfterDelay = () => {
        clearCollapseTimer();
        collapseTimer.current = window.setTimeout(() => {
            collapseTimer.current = null;
            setIsOpen(false);
        }, collapseDelay);
    };

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        const parser = event.getParser();

        if (!enabled || !parser.roomEnter || !roomSession || parser.data.roomId !== roomSession.roomId) return;

        setInfo({
            roomId: parser.data.roomId,
            roomName: parser.data.roomName,
            ownerName: parser.data.showOwner ? parser.data.ownerName : '',
            tags: (parser.data.tags || []).filter((tag) => !!tag).slice(0, MAX_TAGS)
        });
        setIsOpen(true);
        collapseAfterDelay();
    });

    // Hovering pauses the countdown; leaving restarts it from scratch, like
    // the official WME_OVER / WME_OUT handling.
    useEffect(() => {
        if (!isOpen) return;

        if (isHovered) clearCollapseTimer();
        else collapseAfterDelay();
    }, [isHovered, isOpen]);

    useEffect(() => {
        if (!roomSession) setIsOpen(false);
    }, [roomSession]);

    useEffect(() => clearCollapseTimer, []);

    const openTagSearch = (tag: string) => {
        CreateLinkEvent(`navigator/tag/${tag}`);
        setIsOpen(false);
    };

    if (!enabled || !info) return null;

    return (
        <AnimatePresence>
            {isOpen && isToolsOpen && (
                <motion.div
                    animate={{ x: 0, opacity: 1 }}
                    className="octane-room-tools-info"
                    data-testid="room-tools-info"
                    exit={{ x: -40, opacity: 0 }}
                    initial={{ x: -40, opacity: 0 }}
                    transition={{ duration: 0.1, ease: 'easeOut' }}
                    onClick={() => setIsOpen(false)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="octane-room-tools-info__name">{info.roomName}</div>
                    {info.ownerName && <div className="octane-room-tools-info__owner">{info.ownerName}</div>}
                    {info.tags.length > 0 && (
                        <div className="octane-room-tools-info__tags">
                            {info.tags.map((tag) => (
                                <button
                                    key={tag}
                                    className="octane-room-tools-info__tag"
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openTagSearch(tag);
                                    }}
                                >
                                    #{trimRoomInfoTag(tag)}
                                </button>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
