import * as Popover from '@radix-ui/react-popover';
import { FC, useCallback, useMemo, useState } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../../api';
import { LazyEmojiPicker } from '../../../../common/LazyEmojiPicker';

interface ChatInputEmojiSelectorViewProps {
    addChatEmoji: (emoji: string) => void;
}

/**
 * The emoji-mart picker on the chat bar: pick one and its native glyph is appended to
 * the message. `chat.emoji.enabled` (default on) hides the button for hotels that do
 * not want it.
 */
export const ChatInputEmojiSelectorView: FC<ChatInputEmojiSelectorViewProps> = (props) => {
    const { addChatEmoji = null } = props;
    const [selectorVisible, setSelectorVisible] = useState(false);
    const enabled = useMemo(() => GetConfigurationValue<boolean>('chat.emoji.enabled', true), []);

    const handleEmojiSelect = useCallback(
        (emoji: { native?: string }) => {
            if (emoji?.native && addChatEmoji) addChatEmoji(emoji.native);

            setSelectorVisible(false);
        },
        [addChatEmoji]
    );

    if (!enabled) return null;

    return (
        <Popover.Root open={selectorVisible} onOpenChange={setSelectorVisible}>
            <Popover.Trigger asChild>
                <button
                    aria-label={localizeWithFallback('widgets.chatinput.emoji', 'Emoji')}
                    className="swf-chat-emoji-trigger cursor-pointer select-none"
                    title={localizeWithFallback('widgets.chatinput.emoji', 'Emoji')}
                    type="button"
                >
                    <span aria-hidden="true">🙂</span>
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content align="end" className="swf-chat-emoji-popover z-[1070]" side="top" sideOffset={8}>
                    <LazyEmojiPicker onEmojiSelect={handleEmojiSelect} previewPosition="none" skinTonePosition="search" theme="light" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
