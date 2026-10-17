import { NotificationAlertItem, NotificationAlertType } from '../../../../api';
import { OctaneInfoAlertView } from './OctaneInfoAlertView';
import { OctaneSystemAlertView } from './OctaneSystemAlertView';
import { NotificationAbusiveAlertView } from './NotificationAbusiveAlertView';
import { isCommandListLines, NotificationDefaultAlertView } from './NotificationDefaultAlertView';
import { NotificationMotdAlertView } from './NotificationMotdAlertView';
import { EVENT_ALERT_TYPES, NotificationEventAlertView } from './NotificationEventAlertView';
import { isFurniDataAlert, NotificationFurniDataAlertView } from './NotificationFurniDataAlertView';
import { NotificationSeachAlertView } from './NotificationSearchAlertView';
import { NativeWindowAlert } from '../../../mod-tools/views/NativeAlertView';

export const GetAlertLayout = (item: NotificationAlertItem, onClose: () => void) => {
    if (!item) return null;

    const key = item.id;
    const props = { item, onClose, autoCloseSeconds: item.timeoutSeconds };

    if (EVENT_ALERT_TYPES.includes(item.alertType)) return <NotificationEventAlertView key={key} {...props} />;

    switch (item.alertType) {
        case NotificationAlertType.OCTANE:
            return <OctaneSystemAlertView key={key} {...props} />;
        case NotificationAlertType.OCTANE_INFO:
            return <OctaneInfoAlertView key={key} {...props} />;
        case NotificationAlertType.ABUSIVE:
            return <NotificationAbusiveAlertView key={key} {...props} />;
        case NotificationAlertType.SEARCH:
            return <NotificationSeachAlertView key={key} {...props} />;
        case NotificationAlertType.WINDOW:
            return <NativeWindowAlert key={key} title={item.title} message={item.messages.join('\n')} onClose={onClose} />;
        default:
            if (item.alertType === NotificationAlertType.MOTD && !isFurniDataAlert(item) && !isCommandListLines(item.messages.flatMap((message) => message.split(/\r\n|\r|\n/g)))) {
                return <NotificationMotdAlertView key={key} {...props} />;
            }
            if (isFurniDataAlert(item)) return <NotificationFurniDataAlertView key={key} {...props} />;

            return <NotificationDefaultAlertView key={key} {...props} />;
    }
};
