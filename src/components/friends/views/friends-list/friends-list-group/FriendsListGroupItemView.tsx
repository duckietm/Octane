import { FC, MouseEvent, useEffect, useRef, useState } from 'react';
import { LocalizeText, MessengerFriend, OpenMessengerChat } from '../../../../../api';
import { LayoutAvatarImageView, UserProfileIconView } from '../../../../../common';
import { useFriends } from '../../../../../hooks';
import { isStaffChatIdentity } from '../../../staffChatIdentity';
import { StaffChatFrankIconView } from '../../../StaffChatFrankIconView';
import { resolveAvatarFigure } from '../resolveAvatarFigure';
import { resolveAvatarGender } from '../resolveAvatarGender';
import { canFollowFriendListEntry } from './friendsListActions.helpers';
import { BaseButton } from '../../../../../common/BaseButton';

export const FriendsListGroupItemView: FC<{ friend: MessengerFriend; selected: boolean; selectFriend: (userId: number) => void }> = ({
    friend,
    selected,
    selectFriend
}) => {
    const [isRelationshipOpen, setIsRelationshipOpen] = useState(false);
    const { followFriend = null, updateRelationship = null } = useFriends();
    const relationshipMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isRelationshipOpen) return;

        const close = (event: globalThis.MouseEvent) => {
            if (!relationshipMenuRef.current?.contains(event.target as Node)) setIsRelationshipOpen(false);
        };

        window.addEventListener('mousedown', close);

        return () => window.removeEventListener('mousedown', close);
    }, [isRelationshipOpen]);

    if (!friend) return null;

    const isStaffChat = isStaffChatIdentity(friend);
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
        <div
            className={`hfl-friend ${friend.online ? 'online' : 'offline'}${selected ? ' selected' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => selectFriend(friend.id)}
            onDoubleClick={() => friend.online && OpenMessengerChat(friend.id)}
            onKeyDown={(event) => event.key === 'Enter' && selectFriend(friend.id)}
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
            <span className="hfl-friend-name">{friend.name}</span>
            <div className="hfl-friend-actions" onClick={stop}>
                {friend.id > 0 && (
                    <BaseButton
                        type="button"
                        className={`hfl-relationship ${relationshipName}`}
                        title={LocalizeText('friendlist.tip.relationship')}
                        onClick={() => setIsRelationshipOpen((value) => !value)}
                    />
                )}
                {canFollowFriendListEntry(friend) && (
                    <BaseButton type="button" className="hfl-action follow" title={LocalizeText('friendlist.tip.follow')} onClick={() => followFriend(friend)} />
                )}
                <BaseButton type="button" className="hfl-action chat" title={LocalizeText('friendlist.tip.im')} onClick={() => OpenMessengerChat(friend.id)} />
            </div>
            {isRelationshipOpen && (
                <div ref={relationshipMenuRef} className="hfl-relationship-menu">
                    <BaseButton type="button" className="none" onClick={(event) => setRelationship(event, MessengerFriend.RELATIONSHIP_NONE)} />
                    <BaseButton type="button" className="heart" onClick={(event) => setRelationship(event, MessengerFriend.RELATIONSHIP_HEART)} />
                    <BaseButton type="button" className="smile" onClick={(event) => setRelationship(event, MessengerFriend.RELATIONSHIP_SMILE)} />
                    <BaseButton type="button" className="bobba" onClick={(event) => setRelationship(event, MessengerFriend.RELATIONSHIP_BOBBA)} />
                </div>
            )}
        </div>
    );
};
