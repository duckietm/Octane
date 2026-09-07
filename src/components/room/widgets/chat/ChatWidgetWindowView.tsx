import { GetSessionDataManager, RoomObjectType } from '@octane/renderer';
import { FC, UIEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatEntryType, LocalizeText, SanitizeHtml } from '../../../../api';
import { DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useChatHistory, useChatWindow, useOnClickChat } from '../../../../hooks';
import { useRoom } from '../../../../hooks/rooms';

const BOTTOM_SCROLL_THRESHOLD = 20;

export const ChatWidgetWindowView: FC<{}> = () => {
    const contentRef = useRef<HTMLDivElement>(null);
    const lastScrollTop = useRef(0);
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
    const [hidePets, setHidePets] = useState(false);
    const [hideAvatars, setHideAvatars] = useState(false);
    const [hideBalloons, setHideBalloons] = useState(false);
    const [search, setSearch] = useState('');
    const { chatHistory = [], clearChatHistory = null } = useChatHistory();
    const [, setChatWindowEnabled] = useChatWindow();
    const { roomSession = null } = useRoom();
    const { onClickChat } = useOnClickChat();
    const ownUserId = GetSessionDataManager()?.userId || -1;

    const roomChatHistory = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return chatHistory.filter((chat) => {
            if (chat.type !== ChatEntryType.TYPE_CHAT) return false;
            if (chat.roomId !== roomSession?.roomId) return false;
            if (hidePets && chat.entityType === RoomObjectType.PET) return false;

            if (!normalizedSearch.length) return true;

            return `${chat.name} ${chat.message || ''} ${chat.originalMessage || ''} ${chat.translatedMessage || ''}`.toLowerCase().includes(normalizedSearch);
        });
    }, [chatHistory, roomSession?.roomId, hidePets, search]);

    const isAtBottom = useCallback((element: HTMLDivElement) => {
        const distanceToBottom = element.scrollHeight - element.clientHeight - element.scrollTop;

        return distanceToBottom <= BOTTOM_SCROLL_THRESHOLD;
    }, []);

    const scrollToLatest = useCallback((smooth: boolean = true) => {
        if (!contentRef.current) return;

        const element = contentRef.current;

        element.scrollTo({ top: element.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    const onScroll = useCallback(
        (event: UIEvent<HTMLDivElement>) => {
            const element = event.currentTarget;
            const atBottom = isAtBottom(element);
            const isScrollingUp = element.scrollTop < lastScrollTop.current;

            lastScrollTop.current = element.scrollTop;

            if (atBottom) {
                if (!isAutoScrollEnabled) setIsAutoScrollEnabled(true);

                return;
            }

            if (isAutoScrollEnabled && isScrollingUp) setIsAutoScrollEnabled(false);
        },
        [isAtBottom, isAutoScrollEnabled]
    );

    useEffect(() => {
        if (!contentRef.current || !isAutoScrollEnabled) return;

        scrollToLatest();
    }, [roomChatHistory.length, isAutoScrollEnabled, scrollToLatest]);

    return (
        <OctaneCardView
            className="w-[460px] h-[240px]"
            disableDrag={false}
            style={{ pointerEvents: 'auto' }}
            theme="primary-slim"
            uniqueKey="chat-widget-window"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <OctaneCardHeaderView
                headerText="Chat window"
                onCloseClick={() => {
                    setChatWindowEnabled(false);

                    if (clearChatHistory) clearChatHistory();
                }}
            />
            <OctaneCardContentView className="bg-[#f2f2f2] relative" overflow="hidden">
                <div className="flex items-center gap-2 px-2 py-1 border-b border-black/20 bg-white/40 text-black text-[11px]">
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input checked={hidePets} type="checkbox" onChange={(event) => setHidePets(event.target.checked)} />
                        <span>{LocalizeText('widget.room.chat.hide_pets')}</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input checked={hideAvatars} type="checkbox" onChange={(event) => setHideAvatars(event.target.checked)} />
                        <span>{LocalizeText('widget.room.chat.hide_avatars')}</span>
                    </label>
                    <button
                        className="ml-auto px-1 py-0.5 rounded border border-black/30 bg-white/70 text-[11px] text-black hover:bg-white"
                        onClick={() => setHideBalloons((value) => !value)}
                        type="button"
                    >
                        {hideBalloons ? LocalizeText('widget.room.chat.show_balloon') : LocalizeText('widget.room.chat.hide_balloon')}
                    </button>
                    <button
                        className="px-1 py-0.5 rounded border border-black/30 bg-white/70 text-[11px] text-black hover:bg-white"
                        onClick={() => {
                            if (clearChatHistory) clearChatHistory();
                        }}
                        type="button"
                    >
                        {LocalizeText('widget.room.chat.clear_history')}
                    </button>
                    <div>
                        <input
                            className="h-[20px] px-1 rounded border border-black/30 bg-white/70 text-[11px] text-black"
                            placeholder="Search"
                            type="text"
                            value={LocalizeText('navigator.frontpage.staticsearch.8')}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                </div>
                <div ref={contentRef} className="h-[calc(100%-31px)] overflow-y-auto px-2 py-1 text-black text-[13px] leading-4" onScroll={onScroll}>
                    {roomChatHistory.map((chat) => {
                        const isOwnMessage = chat.webId === ownUserId;
                        const rowClassName = `mb-1 flex items-start gap-1 break-words ${isOwnMessage ? 'justify-end' : ''}`;
                        const messageClassName = `message${chat.chatType === 1 ? ' italic text-[#595959]' : ''}${chat.chatType === 2 ? ' font-bold' : ''}`;

                        return (
                            <div key={`${chat.timestamp}-${chat.id}`} className={rowClassName}>
                                {hideBalloons && !hideAvatars && (
                                    <div
                                        className={`w-[65px] h-[55px] shrink-0 mt-[-18px] rounded-sm bg-no-repeat bg-center scale-70 ${isOwnMessage ? 'order-2' : ''}`}
                                        style={chat.imageUrl ? { backgroundImage: `url(${chat.imageUrl})` } : undefined}
                                    />
                                )}
                                {hideBalloons && (
                                    <div onClick={onClickChat}>
                                        <b dangerouslySetInnerHTML={{ __html: SanitizeHtml(`${chat.name}: `) }} />
                                        {!chat.showTranslation && (
                                            <span className={messageClassName} dangerouslySetInnerHTML={{ __html: SanitizeHtml(chat.message) }} />
                                        )}
                                        {chat.showTranslation && (
                                            <div className="mt-[2px] flex flex-col gap-[2px]">
                                                <div className="flex items-start gap-1 leading-[1.15]">
                                                    <span className="inline-block min-w-[52px] font-bold opacity-75">original:</span>
                                                    <span
                                                        className={messageClassName}
                                                        dangerouslySetInnerHTML={{ __html: SanitizeHtml(chat.originalMessage || chat.message || '') }}
                                                    />
                                                </div>
                                                <div className="flex items-start gap-1 leading-[1.15]">
                                                    <span className="inline-block min-w-[52px] font-bold opacity-75">translate:</span>
                                                    <span
                                                        className={messageClassName}
                                                        dangerouslySetInnerHTML={{ __html: SanitizeHtml(chat.translatedMessage || chat.message || '') }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!hideBalloons && (
                                    <div className="bubble-container relative inline-flex items-start">
                                        {chat.style === 0 && (
                                            <div
                                                className="absolute -top-px left-px w-[30px] h-[calc(100%-0.5px)] rounded-[7px] z-1"
                                                style={{ backgroundColor: chat.color }}
                                            />
                                        )}
                                        <div
                                            className={`chat-bubble bubble-${chat.style} type-${chat.chatType} relative z-1 wrap-break-word text-[14px]`}
                                            style={{ maxWidth: '100%' }}
                                        >
                                            <div className="user-container flex items-center justify-center h-full max-h-[24px] overflow-hidden">
                                                {!hideAvatars && chat.imageUrl && chat.imageUrl.length > 0 && (
                                                    <div
                                                        className={`user-image absolute top-[-15px] w-[45px] h-[65px] bg-no-repeat bg-center ${isOwnMessage ? 'right-[-9.25px]' : 'left-[-9.25px]'}`}
                                                        style={{ backgroundImage: `url(${chat.imageUrl})` }}
                                                    />
                                                )}
                                            </div>
                                            <div
                                                className={`chat-content py-[5px] px-[6px] leading-none min-h-[25px] ${!hideAvatars ? (isOwnMessage ? 'mr-[27px]' : 'ml-[27px]') : ''}`}
                                            >
                                                <b className="username" dangerouslySetInnerHTML={{ __html: SanitizeHtml(`${chat.name}: `) }} />
                                                {!chat.showTranslation && (
                                                    <span
                                                        className={messageClassName}
                                                        dangerouslySetInnerHTML={{ __html: SanitizeHtml(`${chat.message}`) }}
                                                        onClick={onClickChat}
                                                    />
                                                )}
                                                {chat.showTranslation && (
                                                    <div className="mt-[2px] flex flex-col gap-[2px]" onClick={onClickChat}>
                                                        <div className="flex items-start gap-1 leading-[1.1]">
                                                            <span className="inline-block min-w-[52px] font-bold" style={{ opacity: 0.75 }}>
                                                                original:
                                                            </span>
                                                            <span
                                                                className={messageClassName}
                                                                dangerouslySetInnerHTML={{
                                                                    __html: SanitizeHtml(`${chat.originalMessage || chat.message || ''}`)
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-start gap-1 leading-[1.1]">
                                                            <span className="inline-block min-w-[52px] font-bold" style={{ opacity: 0.75 }}>
                                                                translate:
                                                            </span>
                                                            <span
                                                                className={messageClassName}
                                                                dangerouslySetInnerHTML={{
                                                                    __html: SanitizeHtml(`${chat.translatedMessage || chat.message || ''}`)
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {!isAutoScrollEnabled && (
                    <button
                        className="absolute bottom-2 right-2 px-2 py-1 text-white text-[11px] rounded bg-black/45 hover:bg-black/60"
                        onClick={() => {
                            setIsAutoScrollEnabled(true);
                            scrollToLatest();
                        }}
                        type="button"
                    >
                        Go to latest message
                    </button>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
