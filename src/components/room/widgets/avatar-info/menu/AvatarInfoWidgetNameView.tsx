import { GetSessionDataManager } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { AvatarInfoName, MessengerFriend, SanitizeHtml } from '../../../../../api';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoWidgetNameViewProps {
    nameInfo: AvatarInfoName;
    onClose: () => void;
}

export const AvatarInfoWidgetNameView: FC<AvatarInfoWidgetNameViewProps> = (props) => {
    const { nameInfo = null, onClose = null } = props;

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = ['name-only'];

        if (nameInfo.isFriend) newClassNames.push('is-friend');

        return newClassNames;
    }, [nameInfo]);

    const relationIconClass = useMemo(() => {
        switch (nameInfo.relationshipStatus) {
            case MessengerFriend.RELATIONSHIP_HEART:
                return 'icon-heart';
            case MessengerFriend.RELATIONSHIP_SMILE:
                return 'icon-smile';
            case MessengerFriend.RELATIONSHIP_BOBBA:
                return 'icon-bobba';
            default:
                return null;
        }
    }, [nameInfo]);

    return (
        <ContextMenuView
            category={nameInfo.category}
            classNames={getClassNames}
            fades={nameInfo.id !== GetSessionDataManager().userId}
            objectId={nameInfo.roomIndex}
            userType={nameInfo.userType}
            onClose={onClose}
        >
            <div className="flex items-center justify-center gap-1">
                {relationIconClass && <div className={`octane-friends-spritesheet ${relationIconClass}`} />}
                <div className="text-shadow" dangerouslySetInnerHTML={{ __html: SanitizeHtml(`${nameInfo.name}`) }}></div>
            </div>
        </ContextMenuView>
    );
};
