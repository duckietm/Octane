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
import { CreateLinkEvent, GetRoomSession, GetUserProfile, LocalizeText, localizeWithFallback, SanitizeHtml, SendMessageComposer } from '../../api';
import { frankStop } from '../../assets/images/user-profile';
import { useIsUserBlocked, useMessageEvent, useNotification, useOctaneEvent } from '../../hooks';
import { OctaneCard } from '../../layout';
import { GroupsContainerView } from './GroupsContainerView';
import { UserContainerView } from './UserContainerView';

export const UserProfileView: FC<{}> = () => {
    const [userProfile, setUserProfile] = useState<UserProfileParser>(null);
    const [userBadges, setUserBadges] = useState<string[]>([]);
    const [userRelationships, setUserRelationships] = useState<RelationshipStatusInfoMessageParser>(null);
    // Official ExtendedProfileWindowCtrl: block_button / blocked_container run off the session
    // block list (BlockedUsersManager), not off the ignore list.
    const isBlocked = useIsUserBlocked(userProfile?.id ?? -1);
    const { showConfirm = null } = useNotification();

    const onClose = () => {
        setUserProfile(null);
        setUserBadges([]);
        setUserRelationships(null);
    };

    // Official blockUser / unblockUser by user id, each behind its confirm
    // (extendedprofile.block_player / unblock_player).
    const toggleBlock = () => {
        if (!userProfile) return;

        const userId = userProfile.id;
        const key = isBlocked ? 'extendedprofile.unblock_player' : 'extendedprofile.block_player';
        const apply = () => (isBlocked ? GetSessionDataManager().unblockUser(userId) : GetSessionDataManager().blockUser(userId));

        showConfirm(
            // The pack stores the line breaks as literal "\n".
            localizeWithFallback(`${key}.desc`, isBlocked ? 'Unblock this user?' : 'Block this user?').replace(/\\n/g, '\n'),
            apply,
            null,
            null,
            null,
            localizeWithFallback(`${key}.title`, isBlocked ? 'Unblock user' : 'Block user')
        );
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
                {isBlocked && (
                    // Official blocked_container: the drama text, whose "event:profile/unblock" link
                    // opens the unblock confirm (it carries no href, so it is never followed as a
                    // page), and Frank's stop sign.
                    <div className="octane-extended-profile__blocked-overlay">
                        <div
                            className="octane-extended-profile__blocked-text"
                            dangerouslySetInnerHTML={{
                                __html: SanitizeHtml(
                                    localizeWithFallback('extendedprofile.blocked', 'You are blocking this user. <a href="event:profile/unblock">Unblock</a>')
                                        .split(' href="event:profile/unblock"')
                                        .join('')
                                )
                            }}
                            onClick={(event) => {
                                if (!(event.target as HTMLElement).closest('a')) return;

                                event.preventDefault();
                                toggleBlock();
                            }}
                        />
                        <img className="octane-extended-profile__blocked-frank" src={frankStop} alt="" draggable={false} />
                    </div>
                )}
                <div className="px-[10px] pt-[8px]">
                    <UserContainerView
                        userBadges={userBadges}
                        userProfile={userProfile}
                        userRelationships={userRelationships}
                        isBlocked={isBlocked}
                        onToggleBlock={toggleBlock}
                        onOpenRooms={onOpenRooms}
                    />
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
