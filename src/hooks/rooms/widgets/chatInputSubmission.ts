import { ChatMessageTypeEnum } from '../../../api/room/widgets/ChatMessageTypeEnum';
import type { HandheldChatMode } from '../../../state/handheldChatComposerStore';

/** The localized keywords a line can start with to pick its own mode (`:whisper`, `:shout`, `:speak`). */
export interface ChatModeKeywords {
    whisper: string;
    shout: string;
    speak: string;
}

/** A typed line taken apart: what goes out, how, and what the desktop field keeps afterwards. */
export interface ChatSubmission {
    text: string;
    chatType: number;
    recipientName: string;
    /** What the desktop field is refilled with (the whisper keyword and name, so a conversation can go on). */
    append: string;
    /** The line started with a mode keyword, which wins over any mode chosen elsewhere. */
    keyword: boolean;
}

/** Reads the mode keyword a line may start with; without one it is speech, or a shout with Shift held. */
export const parseChatSubmission = (value: string, keywords: ChatModeKeywords, shiftKey: boolean = false): ChatSubmission => {
    const parts = value.split(' ');
    const submission: ChatSubmission = {
        text: value,
        chatType: shiftKey ? ChatMessageTypeEnum.CHAT_SHOUT : ChatMessageTypeEnum.CHAT_DEFAULT,
        recipientName: '',
        append: '',
        keyword: true
    };

    switch (parts[0]) {
        case keywords.whisper:
            submission.chatType = ChatMessageTypeEnum.CHAT_WHISPER;
            submission.recipientName = parts[1];
            submission.append = keywords.whisper + ' ' + submission.recipientName + ' ';

            parts.shift();
            parts.shift();
            break;
        case keywords.shout:
            submission.chatType = ChatMessageTypeEnum.CHAT_SHOUT;

            parts.shift();
            break;
        case keywords.speak:
            submission.chatType = ChatMessageTypeEnum.CHAT_DEFAULT;

            parts.shift();
            break;
        default:
            submission.keyword = false;
    }

    submission.text = parts.join(' ');

    return submission;
};

/**
 * The phone composer's mode laid over a parsed line. A keyword typed in the line keeps its say; otherwise the
 * segment decides. Returns null for a whisper that has nobody to go to yet. Nothing is refilled afterwards: the
 * mode itself stays chosen.
 */
export const applyComposerMode = (submission: ChatSubmission, mode: HandheldChatMode, recipient: string): ChatSubmission | null => {
    if (submission.keyword) return { ...submission, append: '' };

    switch (mode) {
        case 'shout':
            return { ...submission, chatType: ChatMessageTypeEnum.CHAT_SHOUT, append: '' };
        case 'whisper':
            if (!recipient) return null;

            return { ...submission, chatType: ChatMessageTypeEnum.CHAT_WHISPER, recipientName: recipient, append: '' };
        default:
            return { ...submission, append: '' };
    }
};
