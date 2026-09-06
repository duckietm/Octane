import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';

interface FriendsRemoveConfirmationViewProps {
    selectedFriendsIds: number[];
    removeFriendsText: string;
    removeSelectedFriends: () => void;
    onCloseClick: () => void;
}

export const FriendsRemoveConfirmationView: FC<FriendsRemoveConfirmationViewProps> = (props) => {
    const { selectedFriendsIds = null, removeFriendsText = null, removeSelectedFriends = null, onCloseClick = null } = props;
    const separatorIndex = removeFriendsText.indexOf(':');
    const removeFriendsLeadText = separatorIndex >= 0 ? removeFriendsText.substring(0, separatorIndex + 1) : removeFriendsText;
    const removeFriendsNamesText = separatorIndex >= 0 ? removeFriendsText.substring(separatorIndex + 1).trimStart() : '';

    return (
        <OctaneCardView
            className="octane-friends-remove-confirmation min-w-0 max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            isResizable={false}
        >
            <OctaneCardHeaderView headerText={LocalizeText('friendlist.removefriendconfirm.title')} onCloseClick={onCloseClick} />
            <OctaneCardContentView className="octane-friends-remove-confirmation-content text-black">
                <div className="octane-friends-remove-confirmation-text">
                    <div>{removeFriendsLeadText}</div>
                    {removeFriendsNamesText.length > 0 && <div className="octane-friends-remove-confirmation-names">{removeFriendsNamesText}</div>}
                </div>
                <div className="octane-friends-remove-confirmation-actions">
                    <Button fullWidth disabled={selectedFriendsIds.length === 0} variant="danger" onClick={removeSelectedFriends}>
                        {LocalizeText('generic.ok')}
                    </Button>
                    <Button fullWidth onClick={onCloseClick}>
                        {LocalizeText('generic.cancel')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
