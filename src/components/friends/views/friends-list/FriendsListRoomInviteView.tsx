import { FC, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';

interface FriendsRoomInviteViewProps {
    selectedFriendsIds: number[];
    onCloseClick: () => void;
    sendRoomInvite: (message: string) => void;
}

export const FriendsRoomInviteView: FC<FriendsRoomInviteViewProps> = (props) => {
    const { selectedFriendsIds = null, onCloseClick = null, sendRoomInvite = null } = props;
    const [roomInviteMessage, setRoomInviteMessage] = useState<string>('');

    return (
        <OctaneCardView
            className="octane-friends-room-invite min-w-0 max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            uniqueKey="octane-friends-room-invite"
            isResizable={false}
        >
            <OctaneCardHeaderView headerText={LocalizeText('friendlist.invite.title')} onCloseClick={onCloseClick} />
            <OctaneCardContentView className="octane-friends-room-invite-content text-black" gap={2}>
                <Text className="octane-friends-room-invite-summary">
                    {LocalizeText('friendlist.invite.summary', ['count'], [selectedFriendsIds.length.toString()])}
                </Text>
                <textarea
                    className="octane-friends-room-invite-textarea"
                    maxLength={255}
                    value={roomInviteMessage}
                    onChange={(event) => setRoomInviteMessage(event.target.value)}
                ></textarea>
                <Text center className="octane-friends-room-invite-note">
                    {LocalizeText('friendlist.invite.note')}
                </Text>
                <div className="octane-friends-room-invite-actions">
                    <Button
                        fullWidth
                        disabled={roomInviteMessage.length === 0 || selectedFriendsIds.length === 0}
                        variant="success"
                        onClick={() => sendRoomInvite(roomInviteMessage)}
                    >
                        {LocalizeText('friendlist.invite.send')}
                    </Button>
                    <Button fullWidth onClick={onCloseClick}>
                        {LocalizeText('generic.cancel')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
