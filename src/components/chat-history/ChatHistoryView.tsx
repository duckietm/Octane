import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { ChatEntryType, SanitizeHtml } from '../../api';
import { ChatBubbleUtilities } from '../../api/room/widgets/ChatBubbleUtilities';
import { useChatHistory, useOnClickChat } from '../../hooks';

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

export const ChatHistoryView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const { chatHistory = [] } = useChatHistory();
    const { onClickChat } = useOnClickChat();
    const elementRef = useRef<HTMLDivElement>(null);
    const prevChatLength = useRef<number>(0);

    const filteredChatHistory = useMemo(() => [...chatHistory], [chatHistory]);

    useEffect(() => {
        if (!elementRef.current || !isVisible) return;

        const element = elementRef.current;

        if (filteredChatHistory.length !== prevChatLength.current) {
            element.scrollTo({ top: element.scrollHeight });
            prevChatLength.current = filteredChatHistory.length;
        }
    }, [filteredChatHistory, isVisible]);

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

    return (
        <div className="octane-chat-history">
            <div className="octane-chat-history-tray-bar" />
            <div className="octane-chat-history-content">
                <div ref={elementRef} className="octane-chat-history-scroll">
                    {filteredChatHistory.map((row, index) => (
                        <div key={`${row.id}-${index}`} className="octane-chat-history-row">
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
