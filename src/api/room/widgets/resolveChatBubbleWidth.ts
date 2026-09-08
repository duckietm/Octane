const KNOWN_WIDTHS = new Set([0, 1, 2]);

/**
 * The width a chat bubble should use: the override a wired message carries when it names one of
 * the widths the room setting knows (0 wide, 1 normal, 2 thin), otherwise the room setting itself.
 */
export const resolveChatBubbleWidth = (override: number | undefined, roomWidth: number): number =>
    typeof override === 'number' && KNOWN_WIDTHS.has(override) ? override : roomWidth;
