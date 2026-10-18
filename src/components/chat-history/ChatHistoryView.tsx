import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { ChatEntryType } from '../../api';
import { useChatHistory } from '../../hooks';
import { ChatHistoryBubbleView } from './ChatHistoryBubbleView';

export const ChatHistoryView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const { chatHistory = [] } = useChatHistory();
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
                                    <ChatHistoryBubbleView entry={row} />
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
