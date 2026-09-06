import { GetRoomEngine, RoomChatSettings, RoomObjectCategory } from '@octane/renderer';
import { CSSProperties, FC, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatBubbleMessage, GetConfigurationValue } from '../../../../api';
import { UserIdentityView } from '../../../../common';
import { useOnClickChat } from '../../../../hooks';
import { useUserDataSnapshot } from '../../../../hooks/session/useSessionSnapshots';
import { CHAT_TEXT_SIZE_EVENT, CHAT_TEXT_SIZE_PIXELS, ChatTextSize, getStoredChatTextSize } from '../chat-input/chatTextSize';
import { measureBubbleVisualOffsets } from './chatBubbleMetrics';
import {
    BUBBLE_GLIDE_DURATION_MS,
    BUBBLE_REVEAL_DELAY_MS,
    clampBubbleLeftToDesktopMargins,
    getBubbleCollisionHeight,
    getChatFontSizeScale,
    getHighlightHint
} from './freeFlowChatLayout';
import { highlightMentions } from './highlightMentions';

// How long the hint of a highlight link stays next to the bubble.
const HIGHLIGHT_HINT_DURATION_MS = 2000;

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
    const [highlightHint, setHighlightHint] = useState<string>(null);
    const elementRef = useRef<HTMLDivElement>(null);
    const makeRoomRef = useRef(makeRoom);
    const revealTimerRef = useRef<number>(0);
    const hintTimerRef = useRef<number>(0);
    const { onClickChat } = useOnClickChat();
    const fontSizeScale = getChatFontSizeScale(CHAT_TEXT_SIZE_PIXELS[chatTextSize]);

    const onMessageClick = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            const target = event.target;

            if (target instanceof HTMLAnchorElement) {
                const hint = getHighlightHint(target.getAttribute('href') || '');

                if (hint !== null) {
                    // A highlight link only names something; it never leaves the room.
                    event.preventDefault();
                    event.stopPropagation();

                    window.clearTimeout(hintTimerRef.current);
                    setHighlightHint(hint);
                    hintTimerRef.current = window.setTimeout(() => setHighlightHint(null), HIGHLIGHT_HINT_DURATION_MS);

                    return;
                }
            }

            onClickChat(event);
        },
        [onClickChat]
    );
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
        // A very tall bubble is drawn in full but only its first 108 px (scaled) collide.
        const collisionHeight = getBubbleCollisionHeight(height, fontSizeScale);
        const visualOffsets = measureBubbleVisualOffsets(element);

        chat.width = width;
        chat.height = collisionHeight;
        chat.visualOffsetTop = visualOffsets.top;
        chat.visualOffsetBottom = visualOffsets.bottom;
        chat.elementRef = element;

        let { left, top } = chat;

        if (!left && !top) {
            left = clampBubbleLeftToDesktopMargins(chat.location.x - width / 2, width, element.parentElement.offsetWidth);
            top = element.parentElement.offsetHeight - height;

            chat.left = left;
            chat.top = top;
        } else if (previousWidth && previousWidth !== width) {
            chat.left += (previousWidth - width) / 2;
        }

        setIsReady(true);

        if (isVisible && (previousWidth !== width || previousHeight !== collisionHeight) && makeRoom) makeRoom(chat);
    }, [
        chat,
        chat.formattedText,
        chat.originalFormattedText,
        chat.showTranslation,
        chat.translatedFormattedText,
        chatTextSize,
        fontSizeScale,
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
            const collisionHeight = getBubbleCollisionHeight(height, getChatFontSizeScale(CHAT_TEXT_SIZE_PIXELS[chat.textSize]));

            if (width === chat.width && collisionHeight === chat.height) return;

            if (chat.width && chat.width !== width) chat.left += (chat.width - width) / 2;

            const visualOffsets = measureBubbleVisualOffsets(element);

            chat.width = width;
            chat.height = collisionHeight;
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
        if (!isReady || !chat || isVisible || revealTimerRef.current) return;

        if (makeRoom) makeRoom(chat);

        // The bubble takes part in the layout at once but, like the official pooled
        // bubble, stays hidden for its first 150 ms so it never appears mid-jump.
        revealTimerRef.current = window.setTimeout(() => setIsVisible(true), BUBBLE_REVEAL_DELAY_MS);
    }, [chat, isReady, isVisible, makeRoom]);

    useEffect(() => {
        return () => {
            window.clearTimeout(revealTimerRef.current);
            window.clearTimeout(hintTimerRef.current);
        };
    }, []);

    // Once shown, every later move (the scroll ticks, a collision) glides in 150 ms.
    const glideStyle: CSSProperties = isVisible ? { transition: `top ${BUBBLE_GLIDE_DURATION_MS}ms linear, left ${BUBBLE_GLIDE_DURATION_MS}ms linear` } : {};

    const messageClassName = `message [overflow-wrap:anywhere] break-words${chat.type === 1 ? ' italic text-[#595959]' : ''}${chat.type === 2 ? ' font-bold' : ''}`;

    return (
        <div
            ref={elementRef}
            className={`bubble-container newbubblehe chat-text-size ${isVisible ? 'visible' : 'invisible'} w-max absolute select-none pointer-events-auto`}
            style={{ '--chat-text-size': `${CHAT_TEXT_SIZE_PIXELS[chatTextSize]}px`, ...glideStyle } as CSSProperties}
            onClick={() => GetRoomEngine().selectRoomObject(chat.roomId, chat.senderId, RoomObjectCategory.UNIT)}
        >
            {highlightHint && (
                <div className="chat-bubble-hint absolute bottom-full left-1/2 z-2 mb-[8px] -translate-x-1/2 whitespace-nowrap rounded-[4px] border border-black/70 bg-[#f7f5ec] px-[6px] py-[2px] text-[11px] font-bold text-black shadow-[1px_1px_0_rgba(0,0,0,0.35)]">
                    {highlightHint}
                </div>
            )}
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
                        <span className={`${messageClassName} align-middle`} dangerouslySetInnerHTML={{ __html: formattedText }} onClick={onMessageClick} />
                    )}
                    {chat.showTranslation && (
                        <div className="mt-[2px] flex flex-col gap-[2px]" onClick={onMessageClick}>
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
