import { FC, MouseEvent, useState } from 'react';
import { GetConfigurationValue, LocalizeText, MessengerFriend, OpenMessengerChat } from '../../../../../api';
import { LayoutAvatarImageView, Popover, PopoverContent, PopoverTrigger, UserProfileIconView } from '../../../../../common';
import { useFriends } from '../../../../../hooks';
import { isStaffChatIdentity } from '../../../staffChatIdentity';
import { StaffChatFrankIconView } from '../../../StaffChatFrankIconView';
import { resolveAvatarFigure } from '../resolveAvatarFigure';
import { resolveAvatarGender } from '../resolveAvatarGender';
import { canChatWithFriendListEntry, canFollowFriendListEntry } from './friendsListActions.helpers';
import { BaseButton } from '../../../../../common/BaseButton';
import { Hint } from '../../../../../common/Tooltip';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

export const FriendsListGroupItemView: FC<{ friend: MessengerFriend; selected: boolean; selectFriend: (userId: number) => void; odd?: boolean }> = ({
    friend,
    selected,
    selectFriend,
    odd = false
}) => {
    const [isRelationshipOpen, setIsRelationshipOpen] = useState(false);
    const { followFriend = null, updateRelationship = null } = useFriends();
    if (!friend) return null;

    const isStaffChat = isStaffChatIdentity(friend);
    const showRelationship = friend.id > 0 && GetConfigurationValue<boolean>('relationship.status.enabled', true) !== false;
    const canChat = canChatWithFriendListEntry(friend, GetConfigurationValue<boolean>('friend_list.persistent_message_status.enabled', true) !== false);
    // AIR refreshFriendEntry: "name (real name)" when the friend has a real name.
    const displayName = friend.realName ? `${friend.name} (${friend.realName})` : friend.name;
    const stop = (event: MouseEvent<HTMLElement>) => event.stopPropagation();
    const relationshipName = (() => {
        switch (friend.relationshipStatus) {
            case MessengerFriend.RELATIONSHIP_HEART:
                return 'heart';
            case MessengerFriend.RELATIONSHIP_SMILE:
                return 'smile';
            case MessengerFriend.RELATIONSHIP_BOBBA:
                return 'bobba';
            default:
                return 'none';
        }
    })();

    const setRelationship = (event: MouseEvent<HTMLButtonElement>, type: number) => {
        stop(event);
        updateRelationship(friend, type);
        setIsRelationshipOpen(false);
    };

    return (
        <NativeTextTree>
            <div
                className={`hfl-friend ${friend.online ? 'online' : 'offline'}${odd ? ' hfl-row-odd' : ''}${selected ? ' selected' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => selectFriend(friend.id)}
                onDoubleClick={() => friend.online && OpenMessengerChat(friend.id)}
                onKeyDown={(event) => event.target === event.currentTarget && event.key === 'Enter' && selectFriend(friend.id)}
            >
                <div className="hfl-friend-avatar">
                    {isStaffChat ? (
                        <StaffChatFrankIconView size={20} />
                    ) : (
                        <LayoutAvatarImageView
                            figure={resolveAvatarFigure(friend.figure, friend.gender)}
                            gender={resolveAvatarGender(friend.gender)}
                            headOnly
                            compactHead
                            compactHeadSize={20}
                            compactHeadPadding={0}
                            direction={2}
                        />
                    )}
                </div>
                <span className="hfl-friend-profile" onClick={stop}>
                    {!isStaffChat && <UserProfileIconView userId={friend.id} />}
                </span>
                <span className="hfl-friend-name">{displayName}</span>
                <div className="hfl-friend-actions" onClick={stop}>
                    {showRelationship && (
                        <Popover open={isRelationshipOpen} onOpenChange={setIsRelationshipOpen}>
                            <PopoverTrigger
                                className={`hfl-relationship ${relationshipName}`}
                                title={LocalizeText('friendlist.tip.relationship')}
                                type="button"
                            />
                            <PopoverContent align="end" className="hfl-relationship-menu" positionerClassName="hfl-relationship-positioner" side="bottom" sideOffset={2}>
                                <div onClick={stop}>
                                    <BaseButton type="button" className="none" onClick={(event) => setRelationship(event, MessengerFriend.RELATIONSHIP_NONE)} />
                                    <BaseButton type="button" className="heart" onClick={(event) => setRelationship(event, MessengerFriend.RELATIONSHIP_HEART)} />
                                    <BaseButton type="button" className="smile" onClick={(event) => setRelationship(event, MessengerFriend.RELATIONSHIP_SMILE)} />
                                    <BaseButton type="button" className="bobba" onClick={(event) => setRelationship(event, MessengerFriend.RELATIONSHIP_BOBBA)} />
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    {canFollowFriendListEntry(friend) && (
                        <Hint content={LocalizeText('friendlist.tip.follow')}>
                            <BaseButton aria-label={LocalizeText('friendlist.tip.follow')} type="button" className="hfl-action follow" onClick={() => followFriend(friend)} />
                        </Hint>
                    )}
                    {canChat && (
                        <Hint content={LocalizeText('friendlist.tip.im')}>
                            <BaseButton aria-label={LocalizeText('friendlist.tip.im')} type="button" className="hfl-action chat" onClick={() => OpenMessengerChat(friend.id)} />
                        </Hint>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
