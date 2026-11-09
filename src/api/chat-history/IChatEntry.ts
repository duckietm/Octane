export interface IChatEntry {
    id: number;
    webId: number;
    entityId: number;
    name: string;
    look?: string;
    /** What is displayed: for room chat, the formatted HTML of the bubble. */
    message?: string;
    /** What was said, as plain text: what a report sends. Entries saved by older clients have none. */
    text?: string;
    entityType?: number;
    style?: number;
    chatType?: number;
    imageUrl?: string;
    /** The chat text size the bubble had when it arrived; the history draws it the same. */
    textSize?: import('../../components/room/widgets/chat-input/chatTextSize').ChatTextSize;
    color?: string;
    showTranslation?: boolean;
    originalMessage?: string;
    translatedMessage?: string;
    detectedLanguage?: string;
    targetLanguage?: string;
    roomId: number;
    timestamp: string;
    type: number;
}
