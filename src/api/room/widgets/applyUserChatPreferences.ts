import { IRoomChatSettings } from '../../navigator';

const NORMAL = 1;
const KNOWN_VALUES = new Set([0, 1, 2]);

export const applyUserChatPreferences = (room: IRoomChatSettings, bubbleWidth: number, scrollSpeed: number): IRoomChatSettings => {
    if (!room) return room;

    const useWidth = KNOWN_VALUES.has(bubbleWidth) && bubbleWidth !== NORMAL;
    const useSpeed = KNOWN_VALUES.has(scrollSpeed) && scrollSpeed !== NORMAL;

    if (!useWidth && !useSpeed) return room;

    return { ...room, weight: useWidth ? bubbleWidth : room.weight, speed: useSpeed ? scrollSpeed : room.speed };
};
