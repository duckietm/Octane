import { GetRoomEngine, RoomChatSettings, RoomObjectCategory } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from 'react';
import { ChatBubbleMessage, GetConfigurationValue } from '../../../../api';
import { UserIdentityView } from '../../../../common';
import { useOnClickChat } from '../../../../hooks';
import { useUserDataSnapshot } from '../../../../hooks/session/useSessionSnapshots';
import { CHAT_TEXT_SIZE_EVENT, CHAT_TEXT_SIZE_PIXELS, ChatTextSize, getStoredChatTextSize } from '../chat-input/chatTextSize';
import { measureBubbleVisualOffsets } from './chatBubbleMetrics';
import { highlightMentions } from './highlightMentions';

interface ChatWidgetMessageViewProps {
    chat: ChatBubbleMessage;
    makeRoom: (chat: ChatBubbleMessage) => void;
    bubbleWidth?: number;
    showPointer?: boolean;
}

export const ChatWidgetMessageView: FC<ChatWidgetMessageViewProps> = ({
    chat = null,
    makeRoom = null,
    bubbleWidth = RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL,
    showPointer = true
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [chatTextSize, setChatTextSize] = useState<ChatTextSize>(() => getStoredChatTextSize());
    const elementRef = useRef<HTMLDivElement>(null);
    const makeRoomRef = useRef(makeRoom);
    const { onClickChat } = useOnClickChat();
    const { userName: ownUsername = '' } = useUserDataSnapshot();

    const mentionsHighlightOn = GetConfigurationValue<boolean>('mentions_ui.enabled', true);

    const highlight = (html: string): string => (mentionsHighlightOn ? highlightMentions(html, ownUsername) : html);

    const formattedText = useMemo(() => highlight(`${chat.formattedText}`), [chat.formattedText, ownUsername, mentionsHighlightOn]);
    const originalFormattedText = useMemo(
        () => highlight(`${chat.originalFormattedText || chat.formattedText}`),
        [chat.originalFormattedText, chat.formattedText, ownUsername, mentionsHighlightOn]
    );
    const translatedFormattedText = useMemo(
        () => highlight(`${chat.translatedFormattedText || chat.formattedText}`),
        [chat.translatedFormattedText, chat.formattedText, ownUsername, mentionsHighlightOn]
    );

    const getBubbleWidth = useMemo(() => {
        switch (bubbleWidth) {
            case RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL:
                return 'max-w-[350px]';
            case RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN:
                return 'max-w-[240px]';
            case RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE:
                return 'max-w-[2000px]';
            default:
                return 'max-w-[350px]';
        }
    }, [bubbleWidth]);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const previousWidth = chat.width;
        const previousHeight = chat.height;
        const { offsetWidth: width, offsetHeight: height } = element;
        const visualOffsets = measureBubbleVisualOffsets(element);

        chat.width = width;
        chat.height = height;
        chat.visualOffsetTop = visualOffsets.top;
        chat.visualOffsetBottom = visualOffsets.bottom;
        chat.elementRef = element;

        let { left, top } = chat;

        if (!left && !top) {
            left = chat.location.x - width / 2;
            top = element.parentElement.offsetHeight - height;

            chat.left = left;
            chat.top = top;
        } else if (previousWidth && previousWidth !== width) {
            chat.left += (previousWidth - width) / 2;
        }

        setIsReady(true);

        if (isVisible && (previousWidth !== width || previousHeight !== height) && makeRoom) makeRoom(chat);
    }, [
        chat,
        chat.formattedText,
        chat.originalFormattedText,
        chat.showTranslation,
        chat.translatedFormattedText,
        chatTextSize,
        isVisible,
        makeRoom,
        showPointer
    ]);

    useEffect(() => {
        const onChatTextSizeChange = (event: Event) => {
            setChatTextSize((event as CustomEvent<ChatTextSize>).detail || getStoredChatTextSize());
        };

        window.addEventListener(CHAT_TEXT_SIZE_EVENT, onChatTextSizeChange);

        return () => window.removeEventListener(CHAT_TEXT_SIZE_EVENT, onChatTextSizeChange);
    }, []);

    useEffect(() => {
        makeRoomRef.current = makeRoom;
    }, [makeRoom]);

    useEffect(() => {
        const element = elementRef.current;

        if (!element || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            const { offsetWidth: width, offsetHeight: height } = element;

            if (width === chat.width && height === chat.height) return;

            if (chat.width && chat.width !== width) chat.left += (chat.width - width) / 2;

            const visualOffsets = measureBubbleVisualOffsets(element);

            chat.width = width;
            chat.height = height;
            chat.visualOffsetTop = visualOffsets.top;
            chat.visualOffsetBottom = visualOffsets.bottom;

            if (makeRoomRef.current) makeRoomRef.current(chat);
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, [chat]);

    useEffect(() => {
        return () => {
            chat.elementRef = null;
        };
    }, [chat]);

    useEffect(() => {
        if (!isReady || !chat || isVisible) return;

        if (makeRoom) makeRoom(chat);
        setIsVisible(true);
    }, [chat, isReady, isVisible, makeRoom]);

    const messageClassName = `message [overflow-wrap:anywhere] break-words${chat.type === 1 ? ' italic text-[#595959]' : ''}${chat.type === 2 ? ' font-bold' : ''}`;

    return (
        <div
            ref={elementRef}
            className={`bubble-container newbubblehe chat-text-size ${isVisible ? 'visible' : 'invisible'} w-max absolute select-none pointer-events-auto`}
            style={{ '--chat-text-size': `${CHAT_TEXT_SIZE_PIXELS[chatTextSize]}px` } as CSSProperties}
            onClick={() => GetRoomEngine().selectRoomObject(chat.roomId, chat.senderId, RoomObjectCategory.UNIT)}
        >
            {chat.styleId === 0 && (
                <div className="absolute -top-px left-px w-[30px] h-[calc(100%-0.5px)] rounded-[7px] z-1" style={{ backgroundColor: chat.color }} />
            )}
            <div
                className={`chat-bubble bubble-${chat.styleId} type-${chat.type} ${getBubbleWidth} relative z-1 wrap-break-word min-h-[26px]`}
            >
                <div className="user-container flex items-center justify-center h-full max-h-[24px] overflow-hidden">
                    {chat.imageUrl && chat.imageUrl.length > 0 && (
                        <div
                            className="user-image absolute top-[-15px] left-[-9.25px] w-[45px] h-[65px] bg-no-repeat bg-center"
                            style={{ backgroundImage: `url(${chat.imageUrl})` }}
                        />
                    )}
                </div>
                <div className="chat-content py-[5px] px-[6px] ml-[27px] leading-none min-h-[25px]">
                    <UserIdentityView
                        className="mr-1 align-middle"
                        displayOrder={chat.displayOrder}
                        iconClassName="inline-block w-auto h-auto align-[-1px]"
                        nameClassName="username font-bold"
                        nickIcon={chat.nickIcon}
                        prefixClassName=""
                        prefixColor={chat.prefixColor}
                        prefixEffect={chat.prefixEffect}
                        prefixFont={chat.prefixFont}
                        prefixIcon={chat.prefixIcon}
                        prefixText={chat.prefixText}
                        showColon={true}
                        username={chat.username}
                    />
                    {!chat.showTranslation && (
                        <span className={`${messageClassName} align-middle`} dangerouslySetInnerHTML={{ __html: formattedText }} onClick={onClickChat} />
                    )}
                    {chat.showTranslation && (
                        <div className="mt-[2px] flex flex-col gap-[2px]" onClick={onClickChat}>
                            <div className="flex items-start gap-1 leading-[1.1]">
                                <span className="inline-block min-w-[52px] font-bold" style={{ opacity: 0.75 }}>
                                    original:
                                </span>
                                <span className={messageClassName} dangerouslySetInnerHTML={{ __html: originalFormattedText }} />
                            </div>
                            <div className="flex items-start gap-1 leading-[1.1]">
                                <span className="inline-block min-w-[52px] font-bold" style={{ opacity: 0.75 }}>
                                    translate:
                                </span>
                                <span className={messageClassName} dangerouslySetInnerHTML={{ __html: translatedFormattedText }} />
                            </div>
                        </div>
                    )}
                </div>
                {showPointer && (
                    <div
                        className="pointer absolute translate-x-[-50%] w-[9px] h-[6px] bottom-[-5px]"
                        style={{ left: 'var(--chat-pointer-x, 50%)' }}
                    />
                )}
            </div>
        </div>
    );
};
