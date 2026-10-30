import {
    AddLinkEventTracker,
    GroupInformationComposer,
    GroupPurchasedEvent,
    GroupSettingsComposer,
    HabboGroupJoinFailedMessageEvent,
    ILinkEventTracker,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import {
    GetGroupInformation,
    getGroupFailureFallback,
    getGroupFailureTextKey,
    getGroupFailureTitleKey,
    GetRoomSession,
    localizeWithFallback,
    parsePositiveId,
    SendMessageComposer,
    TryVisitRoom
} from '../../api';
import { useGroup, useGroupMemberRemovalSink, useMessageEvent } from '../../hooks';
import { GroupCreatedView } from './views/GroupCreatedView';
import { GroupCreatorView } from './views/GroupCreatorView';
import { GroupHcRequiredView } from './views/GroupHcRequiredView';
import { GroupInformationStandaloneView } from './views/GroupInformationStandaloneView';
import { GroupManagerView } from './views/GroupManagerView';
import { GroupMembersView } from './views/GroupMembersView';
import { GroupAlert, GroupNativeAlertView } from './views/GroupNativeAlertView';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

// HabboGroupsManager.onJoinFailed: reason 4 is "Habbo Club needed for more groups", which opens the HC required window.
const JOIN_FAIL_HC_REQUIRED = 4;

export const GroupsView: FC<{}> = (props) => {
    const [isCreatorVisible, setCreatorVisible] = useState<boolean>(false);
    const [createdGroupId, setCreatedGroupId] = useState<number>(0);
    const [joinFailure, setJoinFailure] = useState<GroupAlert>(null);
    const [isHcRequiredVisible, setHcRequiredVisible] = useState<boolean>(false);
    const {} = useGroup();

    useGroupMemberRemovalSink();

    // The server refuses a join with a reason code; the official client explains it in its plain alert, or asks for Habbo Club.
    useMessageEvent<HabboGroupJoinFailedMessageEvent>(HabboGroupJoinFailedMessageEvent, (event) => {
        const reason = event.getParser().reason;

        if (reason === JOIN_FAIL_HC_REQUIRED) {
            setHcRequiredVisible(true);

            return;
        }

        setJoinFailure({
            title: localizeWithFallback(getGroupFailureTitleKey('join'), 'Group'),
            message: localizeWithFallback(getGroupFailureTextKey('join', reason), getGroupFailureFallback('join', reason))
        });
    });

    // HabboGroupsManager.onGuildCreated: the creator closes, the "group created" window opens and the home room is entered unless the user is already in it.
    useMessageEvent<GroupPurchasedEvent>(GroupPurchasedEvent, (event) => {
        const parser = event.getParser();

        setCreatorVisible(false);
        setCreatedGroupId(parser.guildId || -1);

        if (GetRoomSession()?.roomId !== parser.roomId) TryVisitRoom(parser.roomId);
    });

    // GroupCreatedWindowCtrl: Ok refreshes the new group's details (GetHabboGroupDetails, not opened).
    const closeCreated = () => {
        if (createdGroupId > 0) SendMessageComposer(new GroupInformationComposer(createdGroupId, false));

        setCreatedGroupId(0);
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'create':
                        setCreatorVisible(true);
                        return;
                    case 'manage': {
                        const groupId = parsePositiveId(parts[2]);

                        if (groupId === null) return;

                        setCreatorVisible(false);
                        SendMessageComposer(new GroupSettingsComposer(groupId));
                        return;
                    }
                }
            },
            eventUrlPrefix: 'groups/'
        };

        // The official link router opens a group's information window with group/<id>.
        const infoTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const groupId = Number(url.split('/')[1]);

                if (groupId > 0) GetGroupInformation(groupId);
            },
            eventUrlPrefix: 'group/'
        };

        AddLinkEventTracker(linkTracker);
        AddLinkEventTracker(infoTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(infoTracker);
        };
    }, []);

    return (
        <NativeTextTree>
            <>
                {isCreatorVisible && <GroupCreatorView onClose={() => setCreatorVisible(false)} />}
                {createdGroupId !== 0 && <GroupCreatedView onClose={closeCreated} />}
                {!isCreatorVisible && <GroupManagerView />}
                <GroupMembersView />
                <GroupInformationStandaloneView />
                {joinFailure && <GroupNativeAlertView alert={joinFailure} onClose={() => setJoinFailure(null)} />}
                {isHcRequiredVisible && <GroupHcRequiredView onClose={() => setHcRequiredVisible(false)} />}
            </>
        </NativeTextTree>
    );
};
