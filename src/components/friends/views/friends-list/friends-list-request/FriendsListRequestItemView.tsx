import { FC } from 'react';
import { LocalizeText, MessengerRequest } from '../../../../../api';
import { UserProfileIconView } from '../../../../../common';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { Hint } from '../../../../../common/Tooltip';

/** AIR FriendRequest states: open, accepted, declined. */
export type FriendRequestRowState = 'open' | 'accepted' | 'declined';

interface FriendsListRequestItemViewProps {
    request: MessengerRequest;
    state?: FriendRequestRowState;
    odd?: boolean;
    onAccept: (request: MessengerRequest) => void;
    onDecline: (request: MessengerRequest) => void;
}

export const FriendsListRequestItemView: FC<FriendsListRequestItemViewProps> = (props) => {
    const { request = null, state = 'open', odd = false, onAccept = null, onDecline = null } = props;

    if (!request) return null;

    return (
        <NativeTextTree>
            <div className={`hfl-request${odd ? ' hfl-row-odd' : ''}`}>
                <div className="hfl-request-profile">
                    <UserProfileIconView userId={request.requesterUserId} />
                </div>
                <span className="hfl-request-name">{request.name}</span>
                {state === 'open' ? (
                    <div className="hfl-request-actions">
                        <Hint content={LocalizeText('friendlist.request_accept')}>
                            <BaseButton aria-label={LocalizeText('friendlist.request_accept')} type="button" className="accept" onClick={() => onAccept(request)} />
                        </Hint>
                        <Hint content={LocalizeText('friendlist.request_decline')}>
                            <BaseButton aria-label={LocalizeText('friendlist.request_decline')} type="button" className="decline" onClick={() => onDecline(request)} />
                        </Hint>
                    </div>
                ) : (
                    <span className="hfl-request-info">{LocalizeText(state === 'accepted' ? 'friendlist.request.accepted' : 'friendlist.request.declined')}</span>
                )}
            </div>
        </NativeTextTree>
    );
};
