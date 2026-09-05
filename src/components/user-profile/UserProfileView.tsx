import {
    ExtendedProfileChangedMessageEvent,
    GetSessionDataManager,
    RelationshipStatusInfoEvent,
    RelationshipStatusInfoMessageParser,
    RoomEngineObjectEvent,
    RoomObjectCategory,
    RoomObjectType,
    UserCurrentBadgesComposer,
    UserCurrentBadgesEvent,
    UserProfileEvent,
    UserProfileParser,
    UserRelationshipsComposer
} from '@octane/renderer';
import { FC, useState } from 'react';
import { CreateLinkEvent, GetRoomSession, GetUserProfile, LocalizeText, SendMessageComposer } from '../../api';
import { useMessageEvent, useOctaneEvent } from '../../hooks';
import { OctaneCard } from '../../layout';
import { GroupsContainerView } from './GroupsContainerView';
import { UserContainerView } from './UserContainerView';

export const UserProfileView: FC<{}> = () => {
    const [userProfile, setUserProfile] = useState<UserProfileParser>(null);
    const [userBadges, setUserBadges] = useState<string[]>([]);
    const [userRelationships, setUserRelationships] = useState<RelationshipStatusInfoMessageParser>(null);

    const onClose = () => {
        setUserProfile(null);
        setUserBadges([]);
        setUserRelationships(null);
    };

    const onLeaveGroup = () => {
        if (!userProfile || userProfile.id !== GetSessionDataManager().userId) return;

        GetUserProfile(userProfile.id);
    };

    const onOpenRooms = () => {
        if (!userProfile) return;

        CreateLinkEvent(`navigator/search/hotel_view/owner:${userProfile.username}`);
    };

    useMessageEvent<UserCurrentBadgesEvent>(UserCurrentBadgesEvent, (event) => {
        const parser = event.getParser();

        if (!userProfile || parser.userId !== userProfile.id) return;

        setUserBadges(parser.badges);
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, (event) => {
        const parser = event.getParser();

        if (!userProfile || parser.userId !== userProfile.id) return;

        setUserRelationships(parser);
    });

    useMessageEvent<UserProfileEvent>(UserProfileEvent, (event) => {
        const parser = event.getParser();

        let isSameProfile = false;

        setUserProfile((prevValue) => {
            if (prevValue && prevValue.id) isSameProfile = prevValue.id === parser.id;

            return parser;
        });

        if (!isSameProfile) {
            setUserBadges([]);
            setUserRelationships(null);
        }

        SendMessageComposer(new UserCurrentBadgesComposer(parser.id));
        SendMessageComposer(new UserRelationshipsComposer(parser.id));
    });

    useMessageEvent<ExtendedProfileChangedMessageEvent>(ExtendedProfileChangedMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.userId != userProfile?.id) return;

        GetUserProfile(parser.userId);
    });

    useOctaneEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.SELECTED, (event) => {
        if (!userProfile) return;

        if (event.category !== RoomObjectCategory.UNIT) return;

        const userData = GetRoomSession().userDataManager.getUserDataByIndex(event.objectId);

        if (userData.type !== RoomObjectType.USER) return;

        GetUserProfile(userData.webID);
    });

    if (!userProfile) return null;

    const cardBackgroundId = userProfile.cardBackgroundId ?? 0;
    const cardBackgroundClass = cardBackgroundId ? `profile-card-background card-background-${cardBackgroundId}` : '';

    return (
        <OctaneCard className="octane-extended-profile-window w-[640px] h-[720px] max-w-[96vw] max-h-[92vh]" uniqueKey="octane-user-profile">
            <OctaneCard.Header headerText={LocalizeText('extendedprofile.caption')} onCloseClick={onClose} />
            <OctaneCard.Content className={`octane-extended-profile-window__content overflow-hidden !p-0 flex flex-col ${cardBackgroundClass}`}>
                <div className="px-[10px] pt-[8px]">
                    <UserContainerView userBadges={userBadges} userProfile={userProfile} userRelationships={userRelationships} onOpenRooms={onOpenRooms} />
                </div>
                <div className="octane-extended-profile-window__body octane-extended-profile-window__body--groups flex-1 overflow-hidden px-[10px] pb-[10px] pt-[6px]">
                    <div className="octane-extended-profile-window__panel h-full p-2">
                        <GroupsContainerView
                            fullWidth
                            groups={userProfile.groups}
                            itsMe={userProfile.id === GetSessionDataManager().userId}
                            onLeaveGroup={onLeaveGroup}
                        />
                    </div>
                </div>
            </OctaneCard.Content>
        </OctaneCard>
    );
};
