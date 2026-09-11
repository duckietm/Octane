import { AddLinkEventTracker, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker, RoomObjectType } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatEntryType, IChatEntry, localizeWithFallback, SanitizeHtml } from '../../api';
import { ChatBubbleUtilities } from '../../api/room/widgets/ChatBubbleUtilities';
import { useChatHistory, useNotification, useOnClickChat } from '../../hooks';
import {
    AUTO_SCROLL_TO_LATEST_DURATION_MS,
    getMaxScrollTop,
    getSpringbackTarget,
    glideScrollTop,
    isPinnedToLatest,
    ScrollGlide,
    SPRINGBACK_DURATION_MS,
    WHEEL_SETTLE_DELAY_MS
} from './chatHistoryScroll';

const ChatHistoryUserImage: FC<{ imageUrl?: string; look?: string }> = (props) => {
    const { imageUrl = '', look = '' } = props;
    const [resolvedImageUrl, setResolvedImageUrl] = useState<string>(imageUrl || '');

    useEffect(() => {
        let disposed = false;

        if (imageUrl && imageUrl.length > 0) {
            setResolvedImageUrl(imageUrl);
            return;
        }

        if (!look || !look.length) {
            setResolvedImageUrl('');
            return;
        }

        ChatBubbleUtilities.getUserImage(look).then((url) => {
            if (!disposed) setResolvedImageUrl(url || '');
        });

        return () => {
            disposed = true;
        };
    }, [imageUrl, look]);

    if (!resolvedImageUrl || !resolvedImageUrl.length) return null;

    return (
        <div
            className="user-image absolute top-[-15px] left-[-9.25px] w-[45px] h-[65px] bg-no-repeat bg-center"
            style={{ backgroundImage: `url(${resolvedImageUrl})` }}
        />
    );
};

/**
 * The official history only offers "ignore" on lines spoken by another
 * real user: pets, bots and the reader's own lines have nothing to ignore.
 */
export const canIgnoreChatHistoryEntry = (entry: IChatEntry, ownUserId: number): boolean =>
    entry.type === ChatEntryType.TYPE_CHAT && entry.entityType === RoomObjectType.USER && entry.webId > 0 && entry.webId !== ownUserId;

export const ChatHistoryView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    // Names ignored from this tray, so the button disappears right away instead of
    // waiting for the server to echo the updated ignore list back.
    const [ignoredNames, setIgnoredNames] = useState<string[]>([]);
    const { chatHistory = [] } = useChatHistory();
    const { onClickChat } = useOnClickChat();
    const { showConfirm = null } = useNotification();
    const elementRef = useRef<HTMLDivElement>(null);
    const prevChatLength = useRef<number>(0);
    const glideRef = useRef<ScrollGlide>(null);
    const wheelSettleTimerRef = useRef<number>(0);
    // Whether the reader was looking at the latest line before the history grew;
    // only then does a new line pull the list down, like the official tray.
    const pinnedToLatestRef = useRef(true);

    const filteredChatHistory = useMemo(() => [...chatHistory], [chatHistory]);

    const startGlide = useCallback((element: HTMLElement, target: number, durationMs: number) => {
        glideRef.current?.cancel();
        glideRef.current = glideScrollTop(element, target, durationMs);
    }, []);

    const onScroll = useCallback(() => {
        const element = elementRef.current;

        if (!element) return;

        pinnedToLatestRef.current = isPinnedToLatest(element.scrollTop, element.scrollHeight, element.clientHeight);
    }, []);

    const onWheel = useCallback(() => {
        const element = elementRef.current;

        if (!element) return;

        // A wheel tick always wins over an animation still in flight.
        glideRef.current?.cancel();
        glideRef.current = null;

        window.clearTimeout(wheelSettleTimerRef.current);

        wheelSettleTimerRef.current = window.setTimeout(() => {
            const target = getSpringbackTarget(element.scrollTop, element.scrollHeight, element.clientHeight);

            if (target !== null) startGlide(element, target, SPRINGBACK_DURATION_MS);
        }, WHEEL_SETTLE_DELAY_MS);
    }, [startGlide]);

    const requestIgnore = useCallback(
        (entry: IChatEntry) => {
            if (!showConfirm) return;

            showConfirm(
                localizeWithFallback('chat.ignore_user.confirm.info', `Ignore all future chat from ${entry.name}?`, ['username'], [entry.name]),
                () => {
                    GetSessionDataManager().ignoreUser(entry.name);
                    setIgnoredNames((prevValue) => [...prevValue, entry.name]);
                },
                null,
                null,
                null,
                localizeWithFallback('chat.ignore_user.confirm.title', 'Ignore User')
            );
        },
        [showConfirm]
    );

    useEffect(() => {
        if (!isVisible) {
            prevChatLength.current = 0;
            return;
        }

        const element = elementRef.current;

        if (!element) return;

        if (prevChatLength.current === 0) {
            // Opening the tray lands on the latest line without an animation.
            element.scrollTop = getMaxScrollTop(element.scrollHeight, element.clientHeight);
            pinnedToLatestRef.current = true;
        } else if (filteredChatHistory.length !== prevChatLength.current && pinnedToLatestRef.current) {
            startGlide(element, getMaxScrollTop(element.scrollHeight, element.clientHeight), AUTO_SCROLL_TO_LATEST_DURATION_MS);
        }

        prevChatLength.current = filteredChatHistory.length;
    }, [filteredChatHistory, isVisible, startGlide]);

    useEffect(() => {
        return () => {
            glideRef.current?.cancel();
            window.clearTimeout(wheelSettleTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        return;
                }
            },
            eventUrlPrefix: 'chat-history/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    if (!isVisible) return null;

    const ownUserId = GetSessionDataManager().userId;
    const ignoreLabel = localizeWithFallback('chat.ignore_user.confirm.title', 'Ignore User');

    const showIgnoreAction = (row: IChatEntry) =>
        canIgnoreChatHistoryEntry(row, ownUserId) && !ignoredNames.includes(row.name) && !GetSessionDataManager().isUserIgnored(row.name);

    return (
        <div className="octane-chat-history">
            <div className="octane-chat-history-tray-bar" />
            <div className="octane-chat-history-content">
                <div ref={elementRef} className="octane-chat-history-scroll" onScroll={onScroll} onWheel={onWheel}>
                    {filteredChatHistory.map((row, index) => (
                        <div key={`${row.id}-${index}`} className="octane-chat-history-row group">
                            <div className="octane-chat-history-time">{row.timestamp}</div>
                            {row.type === ChatEntryType.TYPE_CHAT && (
                                <div className="octane-chat-history-message">
                                    <div className="octane-chat-history-bubble-wrap bubble-container">
                                        {row.style === 0 && (
                                            <div
                                                className="absolute -top-px left-px w-[30px] h-[calc(100%-0.5px)] rounded-[7px] z-1"
                                                style={{ backgroundColor: row.color }}
                                            />
                                        )}
                                        <div
                                            className={`chat-bubble bubble-${row.style} type-${row.chatType} relative z-1 wrap-break-word`}
                                            style={{
                                                maxWidth: 'min(300px, calc(100vw - 120px))'
                                            }}
                                        >
                                            <div className="user-container flex items-center justify-center h-full max-h-[24px] overflow-hidden">
                                                <ChatHistoryUserImage imageUrl={row.imageUrl} look={row.look} />
                                            </div>
                                            <div className="chat-content py-[5px] px-[6px] ml-[27px] leading-none min-h-[25px]">
                                                <b className="mr-1 username" dangerouslySetInnerHTML={{ __html: SanitizeHtml(`${row.name}: `) }} />
                                                <span
                                                    className="message [overflow-wrap:anywhere] break-words"
                                                    dangerouslySetInnerHTML={{ __html: SanitizeHtml(`${row.message}`) }}
                                                    onClick={onClickChat}
                                                />
                                            </div>
                                            <div className="pointer absolute left-[50%] translate-x-[-50%] w-[9px] h-[6px] bottom-[-5px]" />
                                        </div>
                                    </div>
                                    {showIgnoreAction(row) && (
                                        <button
                                            type="button"
                                            aria-label={ignoreLabel}
                                            title={ignoreLabel}
                                            className="octane-chat-history-ignore invisible group-hover:visible ml-[5px] self-center h-[18px] px-[6px] rounded-[4px] border border-black/60 bg-[#e8443d] text-[10px] leading-[16px] font-bold text-white whitespace-nowrap cursor-pointer hover:brightness-110"
                                            onClick={() => requestIgnore(row)}
                                        >
                                            {ignoreLabel}
                                        </button>
                                    )}
                                </div>
                            )}
                            {row.type === ChatEntryType.TYPE_ROOM_INFO && (
                                <div className="octane-chat-history-room-info">
                                    <i className="octane-icon icon-small-room" />
                                    <span>{row.message || row.name}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <button className="octane-chat-history-handle" type="button" onClick={() => setIsVisible(false)} />
        </div>
    );
};
