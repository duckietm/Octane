import { RoomObjectCategory } from '@octane/renderer';
import { Dispatch, FC, SetStateAction } from 'react';
import { LocalizeText } from '../../../../../api';
import { ContextMenuListItemView } from '../../context-menu/ContextMenuListItemView';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoWidgetDecorateViewProps {
    userId: number;
    userName: string;
    roomIndex: number;
    setIsDecorating: Dispatch<SetStateAction<boolean>>;
}

export const AvatarInfoWidgetDecorateView: FC<AvatarInfoWidgetDecorateViewProps> = (props) => {
    const { userId = -1, userName = '', roomIndex = -1, setIsDecorating = null } = props;

    return (
        // AIR DecorateModeView (own_avatar_decorating): the own-menu bubble with one button, at 80% opacity, 10 px up.
        <ContextMenuView
            anchorGap={-10}
            category={RoomObjectCategory.UNIT}
            classNames={['octane-avatar-action-menu', 'octane-avatar-action-menu--own', 'octane-avatar-action-menu--decorate']}
            freezePositionOnHover={true}
            maximumVerticalLeadRatio={0.05}
            objectId={roomIndex}
            showCaretIcon={false}
            style={{ opacity: 0.8 }}
            onClose={null}
        >
            <div className="air-avatar-menu-buttons">
                <ContextMenuListItemView onClick={() => setIsDecorating(false)}>{LocalizeText('widget.avatar.stop_decorating')}</ContextMenuListItemView>
            </div>
        </ContextMenuView>
    );
};
