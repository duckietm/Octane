import { FC, useCallback, useEffect, useRef } from 'react';
import { CHAT_MODE_LINE_BY_LINE, ChatBubbleMessage, GetConfigurationValue, resolveChatBubbleWidth } from '../../../../api';
import { useChatWidget, useChatWindow } from '../../../../hooks';
import IntervalWebWorker from '../../../../workers/IntervalWebWorker';
import { WorkerBuilder } from '../../../../workers/WorkerBuilder';
import { CHAT_TEXT_SIZE_EVENT } from '../chat-input/chatTextSize';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';
import { ChatWidgetWindowView } from './ChatWidgetWindowView';
import { measureBubbleVisualOffsets } from './chatBubbleMetrics';
import { createLayoutBatcher, getChatViewerHeight, resolveFreeFlowLayout, resolveLineByLineLayout, resolveUntilSettled } from './freeFlowChatLayout';

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

    // Read through refs so the layout callbacks, and the effects that use them, stay the same across messages.
    const chatMessagesRef = useRef(chatMessages);
    const isLineByLineRef = useRef(isLineByLine);
    const scrollSpeedRef = useRef(getScrollSpeed);

    chatMessagesRef.current = chatMessages;
    isLineByLineRef.current = isLineByLine;
    scrollSpeedRef.current = getScrollSpeed;

    const removeHiddenChats = useCallback(() => {
        setChatMessages((prevValue) => {
            if (prevValue) {
                const newMessages = prevValue.filter((chat) => chat.top + chat.height + chat.visualOffsetBottom >= CHAT_REMOVE_TOP_MARGIN);

                if (newMessages.length !== prevValue.length) return newMessages;
            }

            return prevValue;
        });
    }, [setChatMessages]);

    // Reads only: every bubble's size in one go, so the browser lays the page out once.
    const refreshChatMeasurements = useCallback(() => {
        chatMessagesRef.current.forEach((chat) => {
            if (!chat.elementRef) return;

            const visualOffsets = measureBubbleVisualOffsets(chat.elementRef);

            chat.width = chat.elementRef.offsetWidth;
            chat.height = chat.elementRef.offsetHeight;
            chat.visualOffsetTop = visualOffsets.top;
            chat.visualOffsetBottom = visualOffsets.bottom;
        });
    }, []);

    // Free flow lets bubbles slide past each other sideways; line by line gives each its own row. `passes` layout
    // passes in a row (stopping once nothing moves) give what that many separate requests gave.
    const resolveOverlappingChats = useCallback((passes: number = 1) => {
        const visibleChats = chatMessagesRef.current.filter((chat) => chat.elementRef && chat.width > 0 && chat.height > 0);

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
        const { positions } = resolveUntilSettled(bubbles, isLineByLineRef.current ? resolveLineByLineLayout : resolveFreeFlowLayout, passes);
        const byId = new Map(visibleChats.map((chat) => [chat.id, chat]));

        for (const position of positions) {
            const chat = byId.get(position.id);

            if (!chat) continue;
            if (chat.left !== position.left) chat.left = position.left;
            if (chat.top !== position.top) chat.top = position.top;
        }
    }, []);

    const layoutPass = useCallback(
        (passes: number = 1) => {
            refreshChatMeasurements();
            resolveOverlappingChats(passes);
            removeHiddenChats();
        },
        [refreshChatMeasurements, removeHiddenChats, resolveOverlappingChats]
    );

    // A crowded room asks for room many times a frame: the requests are laid out together once per frame. The +1
    // pass stands for the extra layout each new message used to get.
    const batcherRef = useRef<ReturnType<typeof createLayoutBatcher>>(null);

    if (!batcherRef.current) batcherRef.current = createLayoutBatcher((pending) => layoutPass(pending + 1));

    useEffect(() => () => batcherRef.current?.dispose(), []);

    const makeRoom = useCallback((chat: ChatBubbleMessage) => {
        // Like Habbo, a new line-by-line message restarts the scroll timer.
        if (chat && chat.id > lastPlacedIdRef.current) {
            lastPlacedIdRef.current = chat.id;

            if (isLineByLineRef.current) nextScrollAtRef.current = Date.now() + scrollSpeedRef.current;
        }

        batcherRef.current.request();
    }, []);

    // As before, every new message in free flow pushes the next scroll back.
    useEffect(() => {
        nextScrollAtRef.current = Date.now() + getScrollSpeed;
    }, [chatMessages, getScrollSpeed]);

    useEffect(() => {
        const resize = (event: UIEvent = null) => {
            if (!elementRef || !elementRef.current) return;

            const currentHeight = elementRef.current.offsetHeight;
            const configuredHeightPercentage = GetConfigurationValue<number>('chat.viewer.height.percentage', 0.25);
            const newHeight = getChatViewerHeight(document.body.offsetHeight, configuredHeightPercentage);

            elementRef.current.style.height = `${newHeight}px`;

            // Positions are laid out on the bubbles themselves, as the layout pass does: a state updater that
            // changed them and returned the same list re-rendered nothing and could run more than once.
            chatMessagesRef.current.forEach((chat) => (chat.top -= currentHeight - newHeight));

            window.requestAnimationFrame(() => {
                batcherRef.current.flushNow();
                layoutPass();
            });
        };

        window.addEventListener('resize', resize);

        resize();

        return () => {
            window.removeEventListener('resize', resize);
        };
    }, [layoutPass]);

    useEffect(() => {
        const moveAllChatsUp = (amount: number) => {
            batcherRef.current.flushNow();

            chatMessagesRef.current.forEach((chat) => {
                chat.top -= amount;
            });

            layoutPass();
        };

        const worker = new WorkerBuilder(IntervalWebWorker);

        nextScrollAtRef.current = Date.now() + getScrollSpeed;

        worker.onmessage = () => {
            const now = Date.now();

            if (now < nextScrollAtRef.current) return;

            nextScrollAtRef.current = now + scrollSpeedRef.current;
            moveAllChatsUp(CHAT_MOVE_UP_PIXELS);
        };

        worker.postMessage({ action: 'START', content: Math.min(CHAT_SCROLL_TICK_MS, getScrollSpeed) });

        return () => {
            worker.postMessage({ action: 'STOP' });

            worker.terminate();
        };
    }, [getScrollSpeed, layoutPass]);

    useEffect(() => {
        const onTextSizeChange = () => {
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    batcherRef.current.flushNow();
                    layoutPass();
                });
            });
        };

        window.addEventListener(CHAT_TEXT_SIZE_EVENT, onTextSizeChange);

        return () => window.removeEventListener(CHAT_TEXT_SIZE_EVENT, onTextSizeChange);
    }, [layoutPass]);

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
