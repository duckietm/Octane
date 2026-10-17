import { RoomObjectCategory } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText, MessengerRequest } from '../../../../api';
import { ObjectLocationView } from '../object-location/ObjectLocationView';
import { BaseButton } from '../../../../common/BaseButton';

/**
 * The friend request over the head of the sender, drawn like the classic instant request: a yellow
 * bubble with the name, a close cross, "decline" as an underlined link and a green accept button.
 */
export const FriendRequestDialogView: FC<{
    roomIndex: number;
    request: MessengerRequest;
    hideFriendRequest: (userId: number) => void;
    requestResponse: (requestId: number, flag: boolean) => void;
}> = (props) => {
    const { roomIndex = -1, request = null, hideFriendRequest = null, requestResponse = null } = props;

    return (
        <ObjectLocationView category={RoomObjectCategory.UNIT} objectId={roomIndex}>
            <div className="octane-friend-request">
                <svg className="octane-friend-request__icon" viewBox="0 0 15 15" aria-hidden="true">
                    <circle cx="7.5" cy="4.5" r="3" />
                    <path d="M1.5 14c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5z" />
                </svg>
                <div className="octane-friend-request__text">{LocalizeText('widget.friendrequest.from', ['username'], [request.name])}</div>
                <BaseButton
                    aria-label={LocalizeText('generic.close')}
                    className="octane-friend-request__close"
                    type="button"
                    onClick={() => hideFriendRequest(request.requesterUserId)}
                >
                    ×
                </BaseButton>
                <div className="octane-friend-request__actions">
                    <BaseButton className="octane-friend-request__decline" type="button" onClick={() => requestResponse(request.requesterUserId, false)}>
                        {LocalizeText('widget.friendrequest.decline')}
                    </BaseButton>
                    <BaseButton className="octane-friend-request__accept" type="button" onClick={() => requestResponse(request.requesterUserId, true)}>
                        <span aria-hidden="true" className="octane-friend-request__check">
                            ✓
                        </span>
                        {LocalizeText('widget.friendrequest.accept')}
                    </BaseButton>
                </div>
            </div>
        </ObjectLocationView>
    );
};
