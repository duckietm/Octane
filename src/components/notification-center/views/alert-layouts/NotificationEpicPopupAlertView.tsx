import { FC, useState } from 'react';
import { localizeWithFallback, NotificationAlertItem, NotificationAlertType } from '../../../../api';
import { Button, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';

interface NotificationEpicPopupAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

/**
 * The server-pushed campaign popup (`epic_popup_frame`, `HabboEpicPopupView`): a 215x275
 * frame holding one 200x200 picture, a separator and a Close button, nothing else.
 */
export const NotificationEpicPopupAlertView: FC<NotificationEpicPopupAlertViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;
    const [failed, setFailed] = useState(false);

    return (
        <LayoutNotificationAlertView title="" onClose={onClose} {...rest} type={NotificationAlertType.EPIC}>
            <div className="octane-epic-popup__image" data-testid="epic-popup-image">
                {item?.imageUrl && !failed && <img alt="" src={item.imageUrl} onError={() => setFailed(true)} />}
            </div>
            <hr className="my-1 w-full" />
            <Button className="octane-epic-popup__close" onClick={onClose}>
                {localizeWithFallback('alert.close.button', 'Close')}
            </Button>
        </LayoutNotificationAlertView>
    );
};
