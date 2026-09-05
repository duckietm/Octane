import { GetRoomEngine, RoomObjectCategory, RoomUnitWalkComposer } from '@octane/renderer';
import { useEffect, useRef } from 'react';
import { SendMessageComposer } from '../../api';
import { useKeyboardMovement } from '../useKeyboardMovement';
import { useRoom } from './useRoom';

const STEPS: Record<string, [number, number]> = {
    ArrowUp: [-1, -1],
    ArrowDown: [1, 1],
    ArrowLeft: [-1, 1],
    ArrowRight: [1, -1]
};

const REPEAT_DELAY = 180;

/**
 * The room's chat input takes focus on the first keystroke and keeps it, so
 * treating "an input has focus" as "the user is typing" disabled arrow
 * movement for the rest of the session. An empty chat box is not typing:
 * only a message actually being composed should swallow the arrows.
 */
export const isTyping = () => {
    const element = document.activeElement as HTMLElement;

    if (!element) return false;

    if (element.classList.contains('swf-chat-input-field')) {
        return !!(element as HTMLInputElement).value.length;
    }

    const tag = element.tagName;

    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!element.isContentEditable;
};

export const useRoomKeyboardMovement = () => {
    const { roomSession = null } = useRoom();
    const [enabled] = useKeyboardMovement();
    const lastStep = useRef(0);

    useEffect(() => {
        if (!enabled || !roomSession) return;

        const onKeyDown = (event: KeyboardEvent) => {
            const step = STEPS[event.key];

            if (!step) return;
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (isTyping()) return;

            event.preventDefault();
            event.stopPropagation();

            const now = Date.now();

            if (now - lastStep.current < REPEAT_DELAY) return;

            const avatar = GetRoomEngine().getRoomObject(roomSession.roomId, roomSession.ownRoomIndex, RoomObjectCategory.UNIT);

            if (!avatar) return;

            const location = avatar.getLocation();

            if (!location) return;

            lastStep.current = now;

            SendMessageComposer(new RoomUnitWalkComposer(Math.round(location.x) + step[0], Math.round(location.y) + step[1]));
        };

        window.addEventListener('keydown', onKeyDown, true);

        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [enabled, roomSession]);
};
