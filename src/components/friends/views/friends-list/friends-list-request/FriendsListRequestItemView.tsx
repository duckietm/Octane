import { FC } from 'react';
import { LocalizeText, localizeWithFallback, MessengerRequest } from '../../../../../api';
import { UserProfileIconView } from '../../../../../common';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { Hint } from '../../../../../common/Tooltip';

/** AIR FriendRequest states: open, accepted, declined, and failed when the server refused the acceptance. */
export type FriendRequestRowState = 'open' | 'accepted' | 'declined' | 'failed';

const ANSWERED_TEXT: Record<Exclude<FriendRequestRowState, 'open'>, [key: string, fallback: string]> = {
    accepted: ['friendlist.request.accepted', 'Accepted'],
    declined: ['friendlist.request.declined', 'Declined'],
    failed: ['friendlist.request.failed', 'Failed']
};

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
                    <span className="hfl-request-info">{localizeWithFallback(ANSWERED_TEXT[state][0], ANSWERED_TEXT[state][1])}</span>
                )}
            </div>
        </NativeTextTree>
    );
};
