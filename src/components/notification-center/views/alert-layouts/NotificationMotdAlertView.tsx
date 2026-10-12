import { FC } from 'react';
import { LocalizeText, NotificationAlertItem, SanitizeHtml } from '../../../../api';
import { Button, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';

interface NotificationMotdAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

/* Official motd_notification: the title, a scrollable list with one framed box for each message
   and a single OK button. */
export const NotificationMotdAlertView: FC<NotificationMotdAlertViewProps> = (props) => {
    const { item = null, onClose = null, classNames = [], ...rest } = props;

    return (
        <LayoutNotificationAlertView title={item.title} onClose={onClose} classNames={[...classNames, 'octane-motd-alert']} {...rest}>
            <div className="octane-motd-list">
                {item.messages.map((message, index) => (
                    <div
                        key={index}
                        className="octane-motd-item"
                        dangerouslySetInnerHTML={{ __html: SanitizeHtml(message.replace(/\r\n|\r|\n/g, '<br />')) }}
                    />
                ))}
            </div>
            <div className="octane-motd-actions">
                <Button onClick={onClose}>{LocalizeText('generic.close')}</Button>
            </div>
        </LayoutNotificationAlertView>
    );
};
