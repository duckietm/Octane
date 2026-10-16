import { Popover } from '@base-ui/react/popover';
import { FC, useState } from 'react';
import { CHAT_TEXT_SIZES, ChatTextSize, getChatTextSizeLabel, getStoredChatTextSize, setStoredChatTextSize } from './chatTextSize';

interface ChatInputStyleSelectorViewProps {
    chatStyleId: number;
    chatStyleIds: number[];
    selectChatStyleId: (styleId: number) => void;
}

export const ChatInputStyleSelectorView: FC<ChatInputStyleSelectorViewProps> = (props) => {
    const { chatStyleId = 0, chatStyleIds = null, selectChatStyleId = null } = props;
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [chatTextSize, setChatTextSize] = useState<ChatTextSize>(() => getStoredChatTextSize());

    const selectStyle = (styleId: number) => {
        selectChatStyleId(styleId);
        setSelectorVisible(false);
    };

    const selectTextSize = (size: ChatTextSize) => {
        setChatTextSize(size);
        setStoredChatTextSize(size);
    };

    return (
        <Popover.Root open={selectorVisible} onOpenChange={(open) => setSelectorVisible(open)}>
            <Popover.Trigger
                nativeButton={false}
                render={<div />}
                className="swf-chat-style-trigger flex items-center cursor-pointer select-none"
                aria-label="Stili chat"
            >
                <svg className="swf-chat-style-arrow shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
                <div className="swf-chat-style-icon" />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner side="top" align="start" sideOffset={9}>
                    <Popover.Popup className="swf-chat-style-menu">
                        <div className="swf-chat-style-menu-grid">
                            {chatStyleIds &&
                                chatStyleIds.length > 0 &&
                                chatStyleIds.map((styleId) => (
                                    <button
                                        key={styleId}
                                        type="button"
                                        className={`swf-chat-style-option ${chatStyleId === styleId ? 'is-active' : ''}`}
                                        onClick={() => selectStyle(styleId)}
                                    >
                                        <span className="swf-chat-style-preview bubble-container">
                                            <span className={`chat-bubble bubble-${styleId}`} />
                                        </span>
                                    </button>
                                ))}
                        </div>
                        <div className="swf-chat-font-row">
                            <span className="swf-chat-font-label">Dimensione del testo</span>
                            {CHAT_TEXT_SIZES.map((size) => (
                                <button
                                    key={size}
                                    type="button"
                                    className={`swf-chat-font-option ${chatTextSize === size ? 'is-active' : ''}`}
                                    onClick={() => selectTextSize(size)}
                                >
                                    {getChatTextSizeLabel(size)}
                                </button>
                            ))}
                        </div>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
};
