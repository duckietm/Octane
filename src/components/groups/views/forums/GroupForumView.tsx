import {
    AddLinkEventTracker,
    ExtendedForumData,
    ForumDataMessageEvent,
    GetForumStatsMessageComposer,
    GuildForumThread,
    ILinkEventTracker,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { GroupForumListView } from './GroupForumListView';
import { GroupForumNewThreadView } from './GroupForumNewThreadView';
import { GroupForumSettingsView } from './GroupForumSettingsView';
import { GroupForumThreadListView } from './GroupForumThreadListView';
import { GroupForumThreadView } from './GroupForumThreadView';

const VIEW_FORUM_LIST = 0;
const VIEW_THREAD_LIST = 1;
const VIEW_THREAD = 2;
const VIEW_NEW_THREAD = 3;
const VIEW_SETTINGS = 4;

export const GroupForumView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [currentView, setCurrentView] = useState<number>(VIEW_FORUM_LIST);
    const [groupId, setGroupId] = useState<number>(0);
    const [threadId, setThreadId] = useState<number>(0);
    const [currentThread, setCurrentThread] = useState<GuildForumThread>(null);
    const [forumData, setForumData] = useState<ExtendedForumData>(null);

    useMessageEvent<ForumDataMessageEvent>(ForumDataMessageEvent, (event) => {
        const parser = event.getParser();

        setForumData(parser.extendedForumData);
    });

    const openForum = useCallback((id: number) => {
        setGroupId(id);
        setCurrentView(VIEW_THREAD_LIST);
        setIsVisible(true);
        SendMessageComposer(new GetForumStatsMessageComposer(id));
    }, []);

    const openThread = useCallback((gId: number, tId: number, thread: GuildForumThread = null) => {
        setGroupId(gId);
        setThreadId(tId);
        setCurrentThread(thread);
        setCurrentView(VIEW_THREAD);
    }, []);

    const openNewThread = useCallback(() => {
        setCurrentView(VIEW_NEW_THREAD);
    }, []);

    const openSettings = useCallback(() => {
        setCurrentView(VIEW_SETTINGS);
    }, []);

    const backToThreadList = useCallback(() => {
        setCurrentView(VIEW_THREAD_LIST);
        setThreadId(0);
    }, []);

    const backToForumList = useCallback(() => {
        setCurrentView(VIEW_FORUM_LIST);
        setGroupId(0);
        setForumData(null);
    }, []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'toggle':
                        setIsVisible((prev) => !prev);
                        if (!isVisible) setCurrentView(VIEW_FORUM_LIST);
                        return;
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    default: {
                        const id = parseInt(parts[1]);

                        if (!isNaN(id) && id > 0) {
                            openForum(id);
                        }
                        return;
                    }
                }
            },
            eventUrlPrefix: 'groupforum/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [isVisible, openForum]);

    const getHeaderText = () => {
        switch (currentView) {
            case VIEW_FORUM_LIST:
                return LocalizeText('groupforum.view.window_title');
            case VIEW_THREAD_LIST:
                return forumData ? forumData.name : LocalizeText('messageboard.forum.header');
            case VIEW_THREAD:
                return forumData ? forumData.name : LocalizeText('messageboard.forum.header');
            case VIEW_NEW_THREAD:
                return LocalizeText('messageboard.new.thread.button');
            case VIEW_SETTINGS:
                return LocalizeText('groupforum.settings.window_title');
            default:
                return LocalizeText('messageboard.forum.header');
        }
    };

    if (!isVisible) return null;

    return (
        <OctaneCardView className="octane-group-forum w-[600px] h-[500px]" theme="primary" uniqueKey="group-forum">
            <OctaneCardHeaderView headerText={getHeaderText()} onCloseClick={() => setIsVisible(false)} />
            <OctaneCardContentView overflow="hidden" className="p-0">
                {currentView === VIEW_FORUM_LIST && <GroupForumListView onOpenForum={openForum} />}
                {currentView === VIEW_THREAD_LIST && (
                    <GroupForumThreadListView
                        groupId={groupId}
                        forumData={forumData}
                        onOpenThread={openThread}
                        onNewThread={openNewThread}
                        onOpenSettings={openSettings}
                        onBack={backToForumList}
                    />
                )}
                {currentView === VIEW_THREAD && (
                    <GroupForumThreadView groupId={groupId} threadId={threadId} initialThread={currentThread} forumData={forumData} onBack={backToThreadList} />
                )}
                {currentView === VIEW_NEW_THREAD && (
                    <GroupForumNewThreadView
                        groupId={groupId}
                        forumData={forumData}
                        onBack={backToThreadList}
                        onThreadCreated={(tId: number) => openThread(groupId, tId)}
                    />
                )}
                {currentView === VIEW_SETTINGS && <GroupForumSettingsView groupId={groupId} forumData={forumData} onBack={backToThreadList} />}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
