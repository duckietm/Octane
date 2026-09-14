import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';

interface ChatInputReminderHintViewProps {
    visible: boolean;
}

/**
 * The "nux_chat_reminder" hint of the official RoomChatInputView: a small
 * callout above the chat input telling a new user where to type.
 */
export const ChatInputReminderHintView: FC<ChatInputReminderHintViewProps> = ({ visible }) => {
    if (!visible) return null;

    return (
        <div
            className="chat-input-reminder-hint pointer-events-none absolute bottom-full left-[52px] z-[1060] mb-[9px] whitespace-nowrap rounded-[5px] border border-black/70 bg-[#fff9c4] px-[8px] py-[4px] text-[12px] font-bold text-black shadow-[1px_1px_0_rgba(0,0,0,0.35)]"
            role="status"
        >
            {localizeWithFallback('widgets.chatinput.mode.remind.noobie', 'You can type here to talk!')}
            <span className="absolute left-[14px] top-full h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-black/70" />
        </div>
    );
};
