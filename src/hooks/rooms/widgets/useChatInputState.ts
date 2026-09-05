import { RoomEngineObjectEvent, RoomObjectCategory, RoomSessionChatEvent } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { useOctaneEvent } from '../../events';
import { useObjectSelectedEvent } from '../engine';
import { useRoom } from '../useRoom';

/**
 * State + event subscriptions for the chat-input widget. Pure
 * imperative dispatch (sendChat) lives in useChatInputActions.
 *
 *  - selectedUsername  → tracks the last avatar the user clicked,
 *                        used by `/whisper` shortcuts.
 *  - floodBlocked /    → flood-throttle banner state, driven by the
 *    floodBlockedSeconds  renderer's FLOOD_EVENT plus a 1s tick.
 *  - isTyping /        → typing indicator + 10s idle auto-clear, with
 *    isIdle              an internal `typingStartedSent` ref so the
 *                        outgoing sendChatTypingMessage only fires on
 *                        state edges (start / stop), not every render.
 */
export const useChatInputState = () => {
    const [selectedUsername, setSelectedUsername] = useState('');
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [typingStartedSent, setTypingStartedSent] = useState(false);
    const [isIdle, setIsIdle] = useState(false);
    const [floodBlocked, setFloodBlocked] = useState(false);
    const [floodBlockedSeconds, setFloodBlockedSeconds] = useState(0);
    const { roomSession = null } = useRoom();

    useOctaneEvent<RoomSessionChatEvent>(RoomSessionChatEvent.FLOOD_EVENT, (event) => {
        setFloodBlocked(true);
        setFloodBlockedSeconds(parseFloat(event.message));
    });

    useObjectSelectedEvent((event) => {
        if (event.category !== RoomObjectCategory.UNIT) return;

        const userData = roomSession?.userDataManager?.getUserDataByIndex(event.id);

        if (!userData) return;

        setSelectedUsername(userData.name);
    });

    useOctaneEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.DESELECTED, () => setSelectedUsername(''));

    useEffect(() => {
        if (!floodBlocked) return;

        let seconds = 0;

        const interval = setInterval(() => {
            setFloodBlockedSeconds((prevValue) => {
                seconds = (prevValue || 0) - 1;

                return seconds;
            });

            if (seconds < 0) {
                clearInterval(interval);

                setFloodBlocked(false);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [floodBlocked]);

    useEffect(() => {
        if (!isIdle) return;

        const timeout = setTimeout(() => {
            setIsIdle(false);
            setIsTyping(false);
        }, 10000);

        return () => clearTimeout(timeout);
    }, [isIdle]);

    useEffect(() => {
        if (!roomSession) return;

        if (isTyping) {
            if (!typingStartedSent) {
                setTypingStartedSent(true);

                roomSession.sendChatTypingMessage(isTyping);
            }
        } else {
            if (typingStartedSent) {
                setTypingStartedSent(false);

                roomSession.sendChatTypingMessage(isTyping);
            }
        }
    }, [roomSession, isTyping, typingStartedSent]);

    return { selectedUsername, floodBlocked, floodBlockedSeconds, setIsTyping, setIsIdle };
};
