import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';

// Where the official "helpbutton" of the chat input sends the user.
export const CHAT_COMMANDS_HELP_LINK = 'habbopages/chat/commands';

/**
 * The question-mark button of the official RoomChatInputView: hidden until
 * the chat input is hovered, it opens the page listing the chat commands.
 */
export const ChatInputHelpButtonView: FC<{}> = (props) => {
    const label = localizeWithFallback('help.button.cfh', 'Help');

    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className="swf-chat-help-trigger ml-[2px] mr-[6px] flex h-[20px] w-[20px] min-w-[20px] cursor-pointer items-center justify-center rounded-full border border-black/70 bg-[#f7f5ec] text-[13px] font-bold leading-none text-black opacity-0 shadow-[1px_1px_0_rgba(0,0,0,0.35)] transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            onClick={() => CreateLinkEvent(CHAT_COMMANDS_HELP_LINK)}
        >
            ?
        </button>
    );
};
