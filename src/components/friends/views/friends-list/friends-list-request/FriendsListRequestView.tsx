import { FC } from 'react';
import { MessengerRequest } from '../../../../../api';
import { FriendRequestRow } from './friendRequestRows';
import { FriendsListRequestItemView } from './FriendsListRequestItemView';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

interface FriendsListRequestViewProps {
    rows: FriendRequestRow[];
    onAccept: (request: MessengerRequest) => void;
    onDecline: (request: MessengerRequest) => void;
}

export const FriendsListRequestView: FC<FriendsListRequestViewProps> = ({ rows, onAccept, onDecline }) => (
    <NativeTextTree>
        <div className="hfl-requests">
            <div className="hfl-request-list">
                {rows.map((row, index) => (
                    <FriendsListRequestItemView
                        key={row.request.id}
                        request={row.request}
                        state={row.state}
                        odd={index % 2 === 1}
                        onAccept={onAccept}
                        onDecline={onDecline}
                    />
                ))}
            </div>
        </div>
    </NativeTextTree>
);
