import { FC } from 'react';
import { LocalizeText, MessengerRequest } from '../../../../../api';
import { UserProfileIconView } from '../../../../../common';
import { useFriends } from '../../../../../hooks';
import { BaseButton } from '../../../../../common/BaseButton';
import { Hint } from '../../../../../common/Tooltip';

export const FriendsListRequestItemView: FC<{ request: MessengerRequest }> = (props) => {
    const { request = null } = props;
    const { requestResponse = null } = useFriends();

    if (!request) return null;

    return (
        <div className="hfl-request">
                <div className="hfl-request-profile">
                    <UserProfileIconView userId={request.requesterUserId} />
                </div>
                <span className="hfl-request-name">{request.name}</span>
            <div className="hfl-request-actions">
                <Hint content={LocalizeText('friendlist.request_accept')}>
                    <BaseButton aria-label={LocalizeText('friendlist.request_accept')} type="button" className="accept" onClick={() => requestResponse(request.id, true)} />
                </Hint>
                <Hint content={LocalizeText('friendlist.request_decline')}>
                    <BaseButton aria-label={LocalizeText('friendlist.request_decline')} type="button" className="decline" onClick={() => requestResponse(request.id, false)} />
                </Hint>
            </div>
        </div>
    );
};
