import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface FriendsRemoveConfirmationViewProps {
    selectedFriendsIds: number[];
    removeFriendsText: string;
    removeSelectedFriends: () => void;
    onCloseClick: () => void;
}

/**
 * AIR friend_remove_confirm: a 160 x 200 frame with the word-wrapped `friendlist.removefriendconfirm.userlist` text in a
 * bordered box, the thick OK button on the left and Cancel on the right, both 60 x 21 and grey (style 0).
 */
export const FriendsRemoveConfirmationView: FC<FriendsRemoveConfirmationViewProps> = (props) => {
    const { selectedFriendsIds = null, removeFriendsText = null, removeSelectedFriends = null, onCloseClick = null } = props;

    return (
        <NativeTextTree>
            <OctaneCardView
                className="octane-friends-remove-confirmation min-w-0 max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
                theme="primary-slim"
                isResizable={false}
            >
                <OctaneCardHeaderView headerText={LocalizeText('friendlist.removefriendconfirm.title')} onCloseClick={onCloseClick} />
                <OctaneCardContentView className="octane-friends-remove-confirmation-content text-black">
                    <div className="octane-friends-remove-confirmation-text">{removeFriendsText}</div>
                    <div className="octane-friends-remove-confirmation-actions">
                        <Button className="octane-friends-remove-confirmation-ok" variant="secondary" disabled={selectedFriendsIds.length === 0} onClick={removeSelectedFriends}>
                            {LocalizeText('generic.ok')}
                        </Button>
                        <Button variant="secondary" onClick={onCloseClick}>
                            {LocalizeText('generic.cancel')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
