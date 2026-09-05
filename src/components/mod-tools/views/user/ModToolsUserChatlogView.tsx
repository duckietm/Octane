import { ChatRecordData, GetUserChatlogMessageComposer, UserChatlogEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { ChatlogView } from '../chatlog/ChatlogView';

interface ModToolsUserChatlogViewProps {
    userId: number;
    onCloseClick: () => void;
}

export const ModToolsUserChatlogView: FC<ModToolsUserChatlogViewProps> = (props) => {
    const { userId = null, onCloseClick = null } = props;
    const [userChatlog, setUserChatlog] = useState<ChatRecordData[]>(null);
    const [username, setUsername] = useState<string>(null);

    useMessageEvent<UserChatlogEvent>(UserChatlogEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.data.userId !== userId) return;

        setUsername(parser.data.username);
        setUserChatlog(parser.data.roomChatlogs);
    });

    useEffect(() => {
        SendMessageComposer(new GetUserChatlogMessageComposer(userId));
    }, [userId]);

    return (
        <OctaneCardView
            className="octane-mod-tools-chatlog min-w-0 w-[min(520px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <OctaneCardHeaderView
                headerText={username ? LocalizeText('modtools.user.chatlog.title.with', ['username'], [username]) : LocalizeText('modtools.user.chatlog.title')}
                onCloseClick={onCloseClick}
            />
            <OctaneCardContentView className="text-black h-full" gap={1}>
                {userChatlog ? (
                    <ChatlogView key={username ?? ''} initialQuery={username ?? ''} records={userChatlog} />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 opacity-50 text-sm">
                        <FaSpinner className="animate-spin" size={22} />
                        <span>{LocalizeText('modtools.user.chatlog.loading')}</span>
                    </div>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
