import { RoomChatSettings } from '@octane/renderer';
import { FC, useCallback, useEffect, useRef } from 'react';
import { ChatBubbleMessage, GetConfigurationValue, resolveChatBubbleWidth } from '../../../../api';
import { useChatWidget, useChatWindow } from '../../../../hooks';
import IntervalWebWorker from '../../../../workers/IntervalWebWorker';
import { WorkerBuilder } from '../../../../workers/WorkerBuilder';
import { CHAT_TEXT_SIZE_EVENT, CHAT_TEXT_SIZE_PIXELS, getStoredChatTextSize } from '../chat-input/chatTextSize';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';
import { ChatWidgetWindowView } from './ChatWidgetWindowView';
import { measureBubbleVisualOffsets } from './chatBubbleMetrics';
import { getBubbleCollisionHeight, getChatFontSizeScale, getChatViewerHeight, resolveLineByLineLayout } from './freeFlowChatLayout';

const CHAT_MOVE_UP_PIXELS = 19;
const CHAT_COLLISION_ITERATIONS = 20;
const CHAT_COLLISION_MIN_WIDTH = 240;
const CHAT_REMOVE_TOP_MARGIN = -10;
const STACK_OVERLAP = 0;

export const ChatWidgetView: FC<{}> = (props) => {
    const { chatMessages = [], setChatMessages = null, chatSettings = null, getScrollSpeed = 6000 } = useChatWidget();
    const [chatWindowEnabled] = useChatWindow();
    const elementRef = useRef<HTMLDivElement>(null);
    // Settings > Chat: line by line gives every message its own row instead of the free flow.
    const isLineByLine = chatSettings?.mode === RoomChatSettings.CHAT_MODE_LINE_BY_LINE;

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
            chat.height = getBubbleCollisionHeight(chat.elementRef.offsetHeight, getChatFontSizeScale(CHAT_TEXT_SIZE_PIXELS[getStoredChatTextSize()]));
            chat.visualOffsetTop = visualOffsets.top;
            chat.visualOffsetBottom = visualOffsets.bottom;
        });
    }, [chatMessages]);

    const getChatCollisionRect = useCallback((chat: ChatBubbleMessage) => {
        const width = Math.max(chat.width, CHAT_COLLISION_MIN_WIDTH);
        const horizontalPadding = Math.max(0, (width - chat.width) / 2);

        return {
            left: chat.left - horizontalPadding,
            right: chat.left + chat.width + horizontalPadding,
            top: chat.top,
            bottom: chat.top + chat.height
        };
    }, []);

    const resolveOverlappingChats = useCallback(() => {
        const visibleChats = chatMessages.filter((chat) => chat.elementRef && chat.width > 0 && chat.height > 0);

        if (isLineByLine) {
            const byId = new Map(visibleChats.map((chat) => [chat.id, chat]));
            const positions = resolveLineByLineLayout(
                visibleChats.map((chat) => ({
                    id: chat.id,
                    left: chat.left,
                    top: chat.top,
                    width: chat.width,
                    height: chat.height,
                    anchorX: chat.left + chat.width / 2,
                    overflowTop: chat.visualOffsetTop,
                    overflowBottom: chat.visualOffsetBottom
                }))
            );

            for (const position of positions) {
                const chat = byId.get(position.id);

                if (chat && chat.top !== position.top) chat.top = position.top;
            }

            return;
        }

        for (let iteration = 0; iteration < CHAT_COLLISION_ITERATIONS; iteration++) {
            let moved = false;

            for (let firstIndex = 0; firstIndex < visibleChats.length; firstIndex++) {
                const firstChat = visibleChats[firstIndex];

                for (let secondIndex = firstIndex + 1; secondIndex < visibleChats.length; secondIndex++) {
                    const secondChat = visibleChats[secondIndex];
                    const firstRect = getChatCollisionRect(firstChat);
                    const secondRect = getChatCollisionRect(secondChat);
                    const overlapsHorizontally = firstRect.left < secondRect.right && firstRect.right > secondRect.left;
                    const overlapsVertically = firstRect.top < secondRect.bottom && firstRect.bottom > secondRect.top;

                    if (!overlapsHorizontally || !overlapsVertically) continue;

                    const topChat = firstChat.id < secondChat.id ? firstChat : secondChat;
                    const bottomRect = topChat === firstChat ? secondRect : firstRect;
                    const topRect = topChat === firstChat ? firstRect : secondRect;

                    const amount = topRect.bottom - bottomRect.top - STACK_OVERLAP;

                    if (amount <= 0) continue;

                    topChat.top -= amount;
                    moved = true;
                }
            }

            if (!moved) break;
        }
    }, [chatMessages, getChatCollisionRect, isLineByLine]);

    const makeRoom = useCallback(
        (_chat: ChatBubbleMessage) => {
            refreshChatMeasurements();
            resolveOverlappingChats();
            removeHiddenChats();
        },
        [refreshChatMeasurements, removeHiddenChats, resolveOverlappingChats]
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

        worker.onmessage = () => moveAllChatsUp(CHAT_MOVE_UP_PIXELS);

        worker.postMessage({ action: 'START', content: getScrollSpeed });

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
