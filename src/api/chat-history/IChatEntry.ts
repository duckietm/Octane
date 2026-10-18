export interface IChatEntry {
    id: number;
    webId: number;
    entityId: number;
    name: string;
    look?: string;
    message?: string;
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
