import { RoomObjectCategory } from '@octane/renderer';
import { FC } from 'react';
import { GetUserProfile, LocalizeText, MessengerRequest } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { ObjectLocationView } from '../object-location/ObjectLocationView';

/**
 * AIR instant_friend_request, over the head of the sender: a yellow (#fac919) bubble pointing down at them, the profile
 * icon and "friend request from" as a profile link, the red close button, "decline" as an underlined link and the shiny
 * thick accept button with the green check.
 */
export const FriendRequestDialogView: FC<{
    roomIndex: number;
    request: MessengerRequest;
    hideFriendRequest: (userId: number) => void;
    requestResponse: (requestId: number, flag: boolean) => void;
}> = (props) => {
    const { roomIndex = -1, request = null, hideFriendRequest = null, requestResponse = null } = props;

    return (
        <NativeTextTree>
            <ObjectLocationView category={RoomObjectCategory.UNIT} objectId={roomIndex}>
                <div className="octane-friend-request">
                    <BaseButton className="octane-friend-request__profile" type="button" onClick={() => GetUserProfile(request.requesterUserId)}>
                        <span aria-hidden="true" className="octane-friend-request__icon" />
                        <span className="octane-friend-request__text">{LocalizeText('widget.friendrequest.from', ['username'], [request.name])}</span>
                    </BaseButton>
                    <BaseButton
                        aria-label={LocalizeText('generic.close')}
                        className="octane-friend-request__close"
                        type="button"
                        onClick={() => hideFriendRequest(request.requesterUserId)}
                    />
                    <BaseButton className="octane-friend-request__decline" type="button" onClick={() => requestResponse(request.id, false)}>
                        {LocalizeText('widget.friendrequest.decline')}
                    </BaseButton>
                    <BaseButton className="octane-friend-request__accept" type="button" onClick={() => requestResponse(request.id, true)}>
                        <span aria-hidden="true" className="octane-friend-request__check" />
                        {LocalizeText('widget.friendrequest.accept')}
                    </BaseButton>
                </div>
            </ObjectLocationView>
        </NativeTextTree>
    );
};
