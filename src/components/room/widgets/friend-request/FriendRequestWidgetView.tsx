import { FC } from 'react';
import { useFriendRequestWidget, useFriends } from '../../../../hooks';
import { FriendRequestDialogView } from './FriendRequestDialogView';

export const FriendRequestWidgetView: FC<{}> = (props) => {
    const { displayedRequests = [], hideFriendRequest = null } = useFriendRequestWidget();
    const { requestResponse = null, isFriendListFull = null, showFriendListFullAlert = null } = useFriends();

    if (!displayedRequests.length) return null;

    // As the friends list and the friend bar: accepting is refused once the friend list is full.
    const respond = (requestId: number, flag: boolean) => {
        if (flag && isFriendListFull?.()) {
            showFriendListFullAlert?.();
            return;
        }

        requestResponse(requestId, flag);
    };

    return (
        <>
            {displayedRequests.map((request, index) => (
                <FriendRequestDialogView
                    key={index}
                    hideFriendRequest={hideFriendRequest}
                    request={request.request}
                    requestResponse={respond}
                    roomIndex={request.roomIndex}
                />
            ))}
        </>
    );
};
