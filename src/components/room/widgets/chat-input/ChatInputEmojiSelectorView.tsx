import { Popover } from '@base-ui/react/popover';
import { FC, useCallback, useMemo, useState } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../../api';
import { LazyEmojiPicker } from '../../../../common/LazyEmojiPicker';

interface ChatInputEmojiSelectorViewProps {
    addChatEmoji: (emoji: string) => void;
}

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
        <Popover.Root open={selectorVisible} onOpenChange={(open) => setSelectorVisible(open)}>
            <Popover.Trigger
                aria-label={localizeWithFallback('widgets.chatinput.emoji', 'Emoji')}
                className="swf-chat-emoji-trigger cursor-pointer select-none"
                title={localizeWithFallback('widgets.chatinput.emoji', 'Emoji')}
                type="button"
            >
                <span aria-hidden="true">🙂</span>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner align="end" className="z-[1070]" side="top" sideOffset={8}>
                    <Popover.Popup className="swf-chat-emoji-popover">
                        <LazyEmojiPicker onEmojiSelect={handleEmojiSelect} previewPosition="none" skinTonePosition="search" theme="light" />
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
};
