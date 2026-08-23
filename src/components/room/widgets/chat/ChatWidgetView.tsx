import { GetRoomEngine, RoomChatSettings, RoomObjectCategory } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useRef } from 'react';
import { ChatBubbleMessage, GetConfigurationValue, GetRoomObjectScreenLocation } from '../../../../api';
import { useChatWidget, useChatWindow } from '../../../../hooks';
import IntervalWebWorker from '../../../../workers/IntervalWebWorker';
import { WorkerBuilder } from '../../../../workers/WorkerBuilder';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';
import { ChatWidgetWindowView } from './ChatWidgetWindowView';
import { followFreeFlowAnchor, getChatViewerHeight, resolveFreeFlowLayout } from './freeFlowChatLayout';

const CHAT_MOVE_UP_PIXELS = 19;
const CHAT_COLLISION_ITERATIONS = 20;
const CHAT_COLLISION_MIN_WIDTH = 240;
const CHAT_COLLISION_GAP = 1;
const CHAT_REMOVE_TOP_MARGIN = -10;

export const ChatWidgetView: FC<{}> = (props) => {
    const { chatMessages = [], setChatMessages = null, chatSettings = null, getScrollSpeed = 6000 } = useChatWidget();
    const [chatWindowEnabled] = useChatWindow();
    const elementRef = useRef<HTMLDivElement>(null);

    const removeHiddenChats = useCallback(() => {
        setChatMessages((prevValue) => {
            if (prevValue) {
                const newMessages = prevValue.filter((chat) => chat.top + chat.height >= CHAT_REMOVE_TOP_MARGIN);

                if (newMessages.length !== prevValue.length) return newMessages;
            }

            return prevValue;
        });
    }, [setChatMessages]);

    const refreshChatMeasurements = useCallback(() => {
        chatMessages.forEach((chat) => {
            if (!chat.elementRef) return;

            chat.width = chat.elementRef.offsetWidth;
            chat.height = chat.elementRef.offsetHeight;
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

        if (chatSettings?.mode === RoomChatSettings.CHAT_MODE_FREE_FLOW) {
            const positions = resolveFreeFlowLayout(visibleChats.map((chat) => ({
                id: chat.id,
                left: chat.left,
                top: chat.top,
                width: chat.width,
                height: chat.height,
                anchorX: chat.location?.x ?? (chat.left + (chat.width / 2))
            })));
            const positionsById = new Map(positions.map((position) => [position.id, position]));

            visibleChats.forEach((chat) => {
                const position = positionsById.get(chat.id);

                if (!position) return;

                chat.left = position.left;
                chat.top = position.top;
                chat.elementRef.style.setProperty('--chat-pointer-x', `${position.pointerX}px`);
            });

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

                    const topChat =
                        firstChat.top < secondChat.top || (Math.abs(firstChat.top - secondChat.top) < 1 && firstChat.id < secondChat.id)
                            ? firstChat
                            : secondChat;
                    const bottomRect = topChat === firstChat ? secondRect : firstRect;
                    const topRect = topChat === firstChat ? firstRect : secondRect;
                    const amount = Math.max(CHAT_COLLISION_GAP, topRect.bottom - bottomRect.top + CHAT_COLLISION_GAP);

                    topChat.top -= amount;
                    moved = true;
                }
            }

            if (!moved) break;
        }
    }, [chatMessages, chatSettings?.mode, getChatCollisionRect]);

    const syncChatAnchors = useCallback(() => {
        if (chatSettings?.mode !== RoomChatSettings.CHAT_MODE_FREE_FLOW) return;

        let moved = false;

        chatMessages.forEach((chat) => {
            if (!chat.elementRef || !chat.location || chat.senderId < 0) return;

            const roomObject = GetRoomEngine().getRoomObject(chat.roomId, chat.senderId, RoomObjectCategory.UNIT);

            if (!roomObject) return;

            const nextLocation = GetRoomObjectScreenLocation(chat.roomId, chat.senderId, RoomObjectCategory.UNIT);

            if (!nextLocation || !Number.isFinite(nextLocation.x) || Math.abs(nextLocation.x - chat.location.x) < 0.5) return;

            chat.left = followFreeFlowAnchor(chat.left, chat.location.x, nextLocation.x);
            chat.location = { x: nextLocation.x, y: nextLocation.y };
            moved = true;
        });

        if (moved) resolveOverlappingChats();
    }, [chatMessages, chatSettings?.mode, resolveOverlappingChats]);

    const makeRoom = useCallback(
        (chat: ChatBubbleMessage) => {
            refreshChatMeasurements();

            if (chatSettings.mode === RoomChatSettings.CHAT_MODE_FREE_FLOW) {
                resolveOverlappingChats();

                removeHiddenChats();
            } else {
                const lowestPoint = chat.top + chat.height;
                const requiredSpace = chat.height;
                const spaceAvailable = elementRef.current.offsetHeight - lowestPoint;
                const amount = requiredSpace - spaceAvailable;

                if (spaceAvailable < requiredSpace) {
                    setChatMessages((prevValue) => {
                        prevValue.forEach((prevChat) => {
                            if (prevChat === chat) return;

                            prevChat.top -= amount;
                        });

                        return prevValue;
                    });

                    removeHiddenChats();
                }

                resolveOverlappingChats();
            }
        },
        [chatSettings, refreshChatMeasurements, removeHiddenChats, resolveOverlappingChats, setChatMessages]
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
        let animationFrame = 0;

        const updateAnchors = () => {
            syncChatAnchors();
            animationFrame = window.requestAnimationFrame(updateAnchors);
        };

        animationFrame = window.requestAnimationFrame(updateAnchors);

        return () => window.cancelAnimationFrame(animationFrame);
    }, [syncChatAnchors]);

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

    return (
        <div
            ref={elementRef}
            className="absolute flex justify-center items-center w-full top-0 min-h-px z-(--chat-zindex) bg-transparent roundehidden shadow-none pointer-events-none"
        >
            {!chatWindowEnabled &&
                chatMessages.map((chat) => <ChatWidgetMessageView key={chat.id} bubbleWidth={chatSettings.weight} chat={chat} makeRoom={makeRoom} />)}
            {chatWindowEnabled && <ChatWidgetWindowView />}
        </div>
    );
};
