export const CHAT_MODE_FREE_FLOW = 0;
export const CHAT_MODE_LINE_BY_LINE = 1;

/** Line-by-line wins when either the room or the user's own preference asks for it. */
export const resolveChatMode = (roomMode: number, userMode: number): number =>
    roomMode === CHAT_MODE_LINE_BY_LINE || userMode === CHAT_MODE_LINE_BY_LINE ? CHAT_MODE_LINE_BY_LINE : CHAT_MODE_FREE_FLOW;
