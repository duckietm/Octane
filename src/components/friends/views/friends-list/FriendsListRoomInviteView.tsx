import { FC, useState } from 'react';
import { LocalizeText, localizeWithFallback, NotificationAlertType } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useNotification } from '../../../../hooks';

interface FriendsRoomInviteViewProps {
    selectedFriendsIds: number[];
    onCloseClick: () => void;
    sendRoomInvite: (message: string) => void;
}

export const FriendsRoomInviteView: FC<FriendsRoomInviteViewProps> = (props) => {
    const { selectedFriendsIds = null, onCloseClick = null, sendRoomInvite = null } = props;
    const [roomInviteMessage, setRoomInviteMessage] = useState<string>('');
    const { simpleAlert = null } = useNotification();

    return (
        <NativeTextTree>
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
                    {/* AIR room_invite_confirm: style 0 button_thick (send) and button (cancel), both grey. */}
                    <div className="octane-friends-room-invite-actions">
                        <Button
                            fullWidth
                            disabled={selectedFriendsIds.length === 0}
                            variant="secondary"
                            onClick={() => {
                                // AIR RoomInviteView.sendMsg: an empty invite is answered with an alert, not sent.
                                if (!roomInviteMessage.trim().length) {
                                    simpleAlert?.(
                                        localizeWithFallback('friendlist.invite.emptyalert.text', 'Please write a message for your invitation.'),
                                        NotificationAlertType.DEFAULT,
                                        null,
                                        null,
                                        localizeWithFallback('friendlist.invite.emptyalert.title', 'Room invitation')
                                    );

                                    return;
                                }

                                sendRoomInvite(roomInviteMessage);
                            }}
                        >
                            {LocalizeText('friendlist.invite.send')}
                        </Button>
                        <Button fullWidth variant="secondary" onClick={onCloseClick}>
                            {LocalizeText('generic.cancel')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
