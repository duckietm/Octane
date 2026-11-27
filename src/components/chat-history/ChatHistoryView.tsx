import { AddLinkEventTracker, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { ChatEntryType, IChatEntry, LocalizeText, localizeWithFallback } from '../../api';
import { useChatHistory, useIgnoredUsersSnapshot, useNotification } from '../../hooks';
import { ChatHistoryBubbleView } from './ChatHistoryBubbleView';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { Hint } from '../../common/Tooltip';

/**
 * AIR ChatHistoryScrollView.setIgnoreTarget: the ignore cross is offered on a line of another player who is not
 * ignored yet. Lines restored without a player id (webId below 1) and the user's own lines get none.
 */
export const canIgnoreFromHistory = (entry: Pick<IChatEntry, 'type' | 'webId'>, ownUserId: number, ignoredUserIds: ReadonlyArray<number>): boolean =>
    entry.type === ChatEntryType.TYPE_CHAT && entry.webId > 0 && entry.webId !== ownUserId && !ignoredUserIds.includes(entry.webId);

export const ChatHistoryView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const { chatHistory = [] } = useChatHistory();
    const ignoredUserIds = useIgnoredUsersSnapshot();
    const { showConfirm = null } = useNotification();
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

    // AIR hitIgnore: confirm first (chat.ignore_user.confirm.*), then ignore the player.
    const ignoreFromHistory = (entry: IChatEntry) => {
        showConfirm(
            LocalizeText('chat.ignore_user.confirm.info', ['username'], [entry.name ?? '']),
            () => GetSessionDataManager().ignoreUser(entry.webId),
            null,
            null,
            null,
            LocalizeText('chat.ignore_user.confirm.title')
        );
    };

    if (!isVisible) return null;

    const ownUserId = GetSessionDataManager().userId;
    const ignoreLabel = localizeWithFallback('chat.ignore_user.confirm.title', 'Ignore user');

    return (
        <NativeTextTree>
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
                                        {canIgnoreFromHistory(row, ownUserId, ignoredUserIds) && (
                                            <Hint content={ignoreLabel}>
                                                <BaseButton aria-label={ignoreLabel} className="octane-chat-history-ignore" onClick={() => ignoreFromHistory(row)} />
                                            </Hint>
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
                <BaseButton className="octane-chat-history-handle" type="button" onClick={() => setIsVisible(false)} />
            </div>
        </NativeTextTree>
    );
};
