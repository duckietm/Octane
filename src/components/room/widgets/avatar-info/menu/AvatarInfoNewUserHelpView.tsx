import { RoomObjectCategory } from '@octane/renderer';
import { FC } from 'react';
import { AvatarInfoUser, localizeWithFallback } from '../../../../../api';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoNewUserHelpViewProps {
    avatarInfo: AvatarInfoUser;
    onClose: () => void;
}

/**
 * Official NewUserHelpView (`new_user_help`): while the room enter effect runs, the own avatar
 * gets a "You are here!" bubble (`room.enter.infostand.caption`) instead of its menu; it fades
 * like a name bubble.
 */
export const AvatarInfoNewUserHelpView: FC<AvatarInfoNewUserHelpViewProps> = ({ avatarInfo, onClose }) => (
    <NativeTextTree>
        <ContextMenuView
            fades
            category={RoomObjectCategory.UNIT}
            classNames={['name-only', 'octane-new-user-help']}
            objectId={avatarInfo.roomIndex}
            userType={avatarInfo.userType}
            onClose={onClose}
        >
            <div className="text-shadow">{localizeWithFallback('room.enter.infostand.caption', 'You are here!')}</div>
        </ContextMenuView>
    </NativeTextTree>
);
