export interface BottomDockMeasurements {
    viewportWidth: number;
    leftEdge: number;
    rightEdge: number;
    chatWidth?: number;
}

export interface BottomDockLayout {
    chatRaised: boolean;
    chatBottom: number;
}

const AIR_CHAT_WIDTH = 466;
const AIR_RAIL_CLEARANCE = 8;
const AIR_DOCKED_CHAT_BOTTOM = 7;
const AIR_RAISED_CHAT_BOTTOM = 65;
const AIR_FRIEND_TAB_WIDTH = 127;
const AIR_FRIEND_BAR_EDGE_PADDING = 16;

export const AIR_RAIL_CHAT_RESERVED_HALF = 242;

export const AIR_RAIL_EDGE_GAP = 12;

export const resolveBottomDockLayout = (measurements: BottomDockMeasurements): BottomDockLayout => {
    const chatWidth = Math.max(1, measurements.chatWidth ?? AIR_CHAT_WIDTH);
    const centeredLeft = (measurements.viewportWidth - chatWidth) / 2;
    const centeredRight = centeredLeft + chatWidth;
    const canCenter =
        centeredLeft >= measurements.leftEdge + AIR_RAIL_CLEARANCE &&
        centeredRight <= measurements.rightEdge - AIR_RAIL_CLEARANCE;

    if (canCenter) {
        return { chatRaised: false, chatBottom: AIR_DOCKED_CHAT_BOTTOM };
    }

    return { chatRaised: true, chatBottom: AIR_RAISED_CHAT_BOTTOM };
};

export const resolveAirFriendTabCapacity = (availableWidth: number, toolsWidth = 0, spacing = 1): number => {
    const usableWidth = Math.max(0, availableWidth - toolsWidth - AIR_FRIEND_BAR_EDGE_PADDING);

    return Math.max(1, Math.floor(usableWidth / (AIR_FRIEND_TAB_WIDTH + Math.max(0, spacing))));
};
