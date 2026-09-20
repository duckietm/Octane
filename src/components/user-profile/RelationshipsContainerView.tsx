import { GetSessionDataManager, RelationshipStatusEnum, RelationshipStatusInfoMessageParser, SendRoomInviteComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { CreateLinkEvent, DispatchUiEvent, GetRoomSession, GetUserProfile, LocalizeText, RoomWidgetUpdateChatInputContentEvent, SendMessageComposer } from '../../api';
import { Flex, LayoutAvatarImageView } from '../../common';
import { useFriendsActions, useFriendsState, useIsUserIgnored } from '../../hooks';
import { FriendsRoomInviteView } from '../friends/views/friends-list/FriendsListRoomInviteView';
import { RelationshipAction, resolveRelationshipActions } from './relationshipActions';

interface RelationshipsContainerViewProps {
    relationships: RelationshipStatusInfoMessageParser;
}

interface RelationshipsContainerRelationshipViewProps {
    type: number;
    onInvite: (friendId: number) => void;
}

const ACTION_LABEL: Record<RelationshipAction, string> = {
    whisper: 'infostand.button.whisper',
    follow: 'friendlist.tip.follow',
    invite: 'friendlist.tip.invite',
    ignore: 'infostand.button.ignore',
    unignore: 'infostand.button.unignore'
};

const RelationshipActionsView: FC<{ friendId: number; friendName: string; onInvite: (friendId: number) => void }> = ({ friendId, friendName, onInvite }) => {
    const { getFriend } = useFriendsState();
    const { followFriend } = useFriendsActions();
    const isIgnored = useIsUserIgnored(friendName);

    const roomSession = GetRoomSession();
    const friend = getFriend(friendId) ?? null;
    const actions = resolveRelationshipActions({
        targetId: friendId,
        selfId: GetSessionDataManager().userId,
        friend,
        targetInRoom: !!roomSession?.userDataManager?.getUserDataByName(friendName),
        viewerInRoom: !!roomSession,
        isIgnored
    });

    if (!actions.length) return null;

    const run = (action: RelationshipAction) => {
        switch (action) {
            case 'whisper':
                DispatchUiEvent(new RoomWidgetUpdateChatInputContentEvent(RoomWidgetUpdateChatInputContentEvent.WHISPER, friendName));
                return;
            case 'follow':
                if (friend) followFriend(friend);
                return;
            case 'invite':
                onInvite(friendId);
                return;
            case 'ignore':
                GetSessionDataManager().ignoreUser(friendName);
                return;
            case 'unignore':
                GetSessionDataManager().unignoreUser(friendName);
                return;
        }
    };

    return (
        <div className="octane-extended-profile__relationship-actions">
            {actions.map((action) => (
                <button
                    key={action}
                    type="button"
                    className={`octane-extended-profile__relationship-action ${action}`}
                    title={LocalizeText(ACTION_LABEL[action])}
                    aria-label={LocalizeText(ACTION_LABEL[action])}
                    onClick={(event) => {
                        event.stopPropagation();
                        run(action);
                    }}
                />
            ))}
        </div>
    );
};

export const RelationshipsContainerView: FC<RelationshipsContainerViewProps> = (props) => {
    const { relationships = null } = props;
    const [inviteFriendId, setInviteFriendId] = useState<number>(null);

    const sendRoomInvite = (message: string) => {
        if (!inviteFriendId || !message || !message.length || message.length > 255) return;

        SendMessageComposer(new SendRoomInviteComposer(message, [inviteFriendId]));

        setInviteFriendId(null);
    };

    const RelationshipComponent = ({ type, onInvite }: RelationshipsContainerRelationshipViewProps) => {
        const relationshipInfo = relationships && relationships.relationshipStatusMap.hasKey(type) ? relationships.relationshipStatusMap.getValue(type) : null;
        const relationshipName = RelationshipStatusEnum.RELATIONSHIP_NAMES[type].toLocaleLowerCase();
        const hasFriend = !!relationshipInfo && relationshipInfo.friendCount >= 1;

        return (
            <div className="octane-extended-profile__relationship">
                <Flex center className="octane-extended-profile__relationship-icon">
                    <i className={`octane-friends-spritesheet icon-${relationshipName}`} />
                </Flex>
                <div className="octane-extended-profile__relationship-copy">
                    <div className="octane-extended-profile__relationship-box">
                        <p
                            className="octane-extended-profile__relationship-name"
                            onClick={(event) =>
                                relationshipInfo && relationshipInfo.randomFriendId >= 1
                                    ? GetUserProfile(relationshipInfo.randomFriendId)
                                    : CreateLinkEvent('friends/toggle')
                            }
                        >
                            {!hasFriend && LocalizeText('extendedprofile.add.friends')}
                            {hasFriend && relationshipInfo.randomFriendName}
                        </p>
                        {hasFriend && (
                            <div className="octane-extended-profile__relationship-head">
                                <LayoutAvatarImageView direction={2} figure={relationshipInfo.randomFriendFigure} headOnly={true} />
                            </div>
                        )}
                    </div>
                    <div className="octane-extended-profile__relationship-footer">
                        <p className="octane-extended-profile__relationship-subcopy">
                            {!hasFriend && LocalizeText('extendedprofile.no.friends.in.this.category')}
                            {hasFriend &&
                                relationshipInfo.friendCount > 1 &&
                                LocalizeText(`extendedprofile.relstatus.others.${relationshipName}`, ['count'], [(relationshipInfo.friendCount - 1).toString()])}
                            &nbsp;
                        </p>
                        {hasFriend && <RelationshipActionsView friendId={relationshipInfo.randomFriendId} friendName={relationshipInfo.randomFriendName} onInvite={onInvite} />}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <RelationshipComponent type={RelationshipStatusEnum.HEART} onInvite={setInviteFriendId} />
            <RelationshipComponent type={RelationshipStatusEnum.SMILE} onInvite={setInviteFriendId} />
            <RelationshipComponent type={RelationshipStatusEnum.BOBBA} onInvite={setInviteFriendId} />
            {inviteFriendId && <FriendsRoomInviteView selectedFriendsIds={[inviteFriendId]} sendRoomInvite={sendRoomInvite} onCloseClick={() => setInviteFriendId(null)} />}
        </>
    );
};
