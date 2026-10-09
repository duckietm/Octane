import { FC, useCallback, useEffect, useRef } from 'react';
import { CHAT_MODE_LINE_BY_LINE, ChatBubbleMessage, GetConfigurationValue, resolveChatBubbleWidth } from '../../../../api';
import { useChatWidget, useChatWindow } from '../../../../hooks';
import IntervalWebWorker from '../../../../workers/IntervalWebWorker';
import { WorkerBuilder } from '../../../../workers/WorkerBuilder';
import { CHAT_TEXT_SIZE_EVENT } from '../chat-input/chatTextSize';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';
import { ChatWidgetWindowView } from './ChatWidgetWindowView';
import { measureBubbleVisualOffsets } from './chatBubbleMetrics';
import { getChatViewerHeight, resolveFreeFlowLayout, resolveLineByLineLayout } from './freeFlowChatLayout';

const CHAT_MOVE_UP_PIXELS = 19;
const CHAT_REMOVE_TOP_MARGIN = -10;
// The scroll timer checks this often, so a line-by-line insert can push the next scroll back.
const CHAT_SCROLL_TICK_MS = 250;

export const ChatWidgetView: FC<{}> = (props) => {
    const { chatMessages = [], setChatMessages = null, chatSettings = null, getScrollSpeed = 6000, chatMode = 0 } = useChatWidget();
    const [chatWindowEnabled] = useChatWindow();
    const elementRef = useRef<HTMLDivElement>(null);
    const isLineByLine = chatMode === CHAT_MODE_LINE_BY_LINE;
    const nextScrollAtRef = useRef(0);
    const lastPlacedIdRef = useRef(0);

    const removeHiddenChats = useCallback(() => {
        setChatMessages((prevValue) => {
            if (prevValue) {
                const newMessages = prevValue.filter((chat) => chat.top + chat.height + chat.visualOffsetBottom >= CHAT_REMOVE_TOP_MARGIN);

                if (newMessages.length !== prevValue.length) return newMessages;
            }

            return prevValue;
        });
    }, [setChatMessages]);

    const refreshChatMeasurements = useCallback(() => {
        chatMessages.forEach((chat) => {
            if (!chat.elementRef) return;

            const visualOffsets = measureBubbleVisualOffsets(chat.elementRef);

            chat.width = chat.elementRef.offsetWidth;
            chat.height = chat.elementRef.offsetHeight;
            chat.visualOffsetTop = visualOffsets.top;
            chat.visualOffsetBottom = visualOffsets.bottom;
        });
    }, [chatMessages]);

    // Free flow lets bubbles slide past each other sideways; line by line gives each its own row.
    const resolveOverlappingChats = useCallback(() => {
        const visibleChats = chatMessages.filter((chat) => chat.elementRef && chat.width > 0 && chat.height > 0);

        if (visibleChats.length < 2) return;

        const bubbles = visibleChats.map((chat) => ({
            id: chat.id,
            left: chat.left,
            top: chat.top,
            width: chat.width,
            height: chat.height,
            anchorX: chat.left + chat.width / 2,
            overflowTop: chat.visualOffsetTop,
            overflowBottom: chat.visualOffsetBottom
        }));
        const positions = isLineByLine ? resolveLineByLineLayout(bubbles) : resolveFreeFlowLayout(bubbles);
        const byId = new Map(visibleChats.map((chat) => [chat.id, chat]));

        for (const position of positions) {
            const chat = byId.get(position.id);

            if (!chat) continue;
            if (chat.left !== position.left) chat.left = position.left;
            if (chat.top !== position.top) chat.top = position.top;
        }
    }, [chatMessages, isLineByLine]);

    const makeRoom = useCallback(
        (chat: ChatBubbleMessage) => {
            // Like Habbo, a new line-by-line message restarts the scroll timer.
            if (chat && chat.id > lastPlacedIdRef.current) {
                lastPlacedIdRef.current = chat.id;

                if (isLineByLine) nextScrollAtRef.current = Date.now() + getScrollSpeed;
            }

            refreshChatMeasurements();
            resolveOverlappingChats();
            removeHiddenChats();
        },
        [getScrollSpeed, isLineByLine, refreshChatMeasurements, removeHiddenChats, resolveOverlappingChats]
    );

    useEffect(() => {
        const resize = (event: UIEvent = null) => {
            if (!elementRef || !elementRef.current) return;

            const currentHeight = elementRef.current.offsetHeight;
            const configuredHeightPercentage = GetConfigurationValue<number>('chat.viewer.height.percentage', 0.25);
            const newHeight = getChatViewerHeight(document.body.offsetHeight, configuredHeightPercentage);

            elementRef.current.style.height = `${newHeight}px`;

            setChatMessages((prevValue) => {
                if (prevValue) {
                    prevValue.forEach((chat) => (chat.top -= currentHeight - newHeight));
                }

                return prevValue;
            });

            window.requestAnimationFrame(() => {
                refreshChatMeasurements();
                resolveOverlappingChats();
                removeHiddenChats();
            });
        };

        window.addEventListener('resize', resize);

        resize();

        return () => {
            window.removeEventListener('resize', resize);
        };
    }, [refreshChatMeasurements, removeHiddenChats, resolveOverlappingChats, setChatMessages]);

    useEffect(() => {
        const moveAllChatsUp = (amount: number) => {
            setChatMessages((prevValue) => {
                prevValue.forEach((chat) => {
                    chat.top -= amount;
                });

                return prevValue;
            });

            refreshChatMeasurements();
            resolveOverlappingChats();
            removeHiddenChats();
        };

        const worker = new WorkerBuilder(IntervalWebWorker);

        nextScrollAtRef.current = Date.now() + getScrollSpeed;

        worker.onmessage = () => {
            const now = Date.now();

            if (now < nextScrollAtRef.current) return;

            nextScrollAtRef.current = now + getScrollSpeed;
            moveAllChatsUp(CHAT_MOVE_UP_PIXELS);
        };

        worker.postMessage({ action: 'START', content: Math.min(CHAT_SCROLL_TICK_MS, getScrollSpeed) });

        return () => {
            worker.postMessage({ action: 'STOP' });

            worker.terminate();
        };
    }, [getScrollSpeed, refreshChatMeasurements, removeHiddenChats, resolveOverlappingChats, setChatMessages]);

    useEffect(() => {
        const onTextSizeChange = () => {
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    refreshChatMeasurements();
                    resolveOverlappingChats();
                    removeHiddenChats();
                });
            });
        };

        window.addEventListener(CHAT_TEXT_SIZE_EVENT, onTextSizeChange);

        return () => window.removeEventListener(CHAT_TEXT_SIZE_EVENT, onTextSizeChange);
    }, [refreshChatMeasurements, removeHiddenChats, resolveOverlappingChats]);

    return (
        <div
            ref={elementRef}
            className="absolute flex justify-center items-center w-full top-0 min-h-px z-(--chat-zindex) bg-transparent roundehidden shadow-none pointer-events-none"
        >
            {!chatWindowEnabled &&
                chatMessages.map((chat) => (
                    <ChatWidgetMessageView
                        key={chat.id}
                        bubbleWidth={resolveChatBubbleWidth(chat.bubbleWidthOverride, chatSettings.weight)}
                        chat={chat}
                        makeRoom={makeRoom}
                        showPointer={false}
                    />
                ))}
            {chatWindowEnabled && <ChatWidgetWindowView />}
        </div>
    );
};
