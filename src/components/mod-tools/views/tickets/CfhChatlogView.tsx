import { CfhChatlogData, CfhChatlogEvent, GetCfhChatlogMessageComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { ChatlogView } from '../chatlog/ChatlogView';

interface CfhChatlogViewProps {
    issueId: number;
    onCloseClick(): void;
}

export const CfhChatlogView: FC<CfhChatlogViewProps> = (props) => {
    const { onCloseClick = null, issueId = null } = props;
    const [chatlogData, setChatlogData] = useState<CfhChatlogData>(null);

    useMessageEvent<CfhChatlogEvent>(CfhChatlogEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.data.issueId !== issueId) return;

        setChatlogData(parser.data);
    });

    useEffect(() => {
        SendMessageComposer(new GetCfhChatlogMessageComposer(issueId));
    }, [issueId]);

    return (
        <OctaneCardView
            className="octane-mod-tools-chatlog min-w-0 w-[min(520px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
        >
            <OctaneCardHeaderView
                headerText={LocalizeText('modtools.tickets.cfh.chatlog.title', ['issueId'], [issueId.toString()])}
                onCloseClick={onCloseClick}
            />
            <OctaneCardContentView className="text-black" gap={1}>
                {chatlogData ? (
                    <ChatlogView records={[chatlogData.chatRecord]} />
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
