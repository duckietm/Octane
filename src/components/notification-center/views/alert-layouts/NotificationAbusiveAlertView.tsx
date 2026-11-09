import { FC } from 'react';
import { localizeWithFallback, LocalizeText, NotificationAlertItem } from '../../../../api';
import { Button, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface NotificationAbusiveAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

/* Official abusive_notice: a 309 px window with a heading in red, the explanation and one close
   button, shown when a call for help is refused because earlier ones were abusive or too many. */
export const NotificationAbusiveAlertView: FC<NotificationAbusiveAlertViewProps> = (props) => {
    const { item = null, onClose = null, classNames = [], ...rest } = props;

    return (
        <NativeTextTree>
            <LayoutNotificationAlertView
                title={localizeWithFallback('help.emergency.abusive.title', item.title)}
                onClose={onClose}
                classNames={[...classNames, 'octane-abusive-alert']}
                {...rest}
            >
                <div className="octane-abusive-alert__heading">{localizeWithFallback('help.emergency.abusive.subtitle', 'Bad news!')}</div>
                <div className="octane-abusive-alert__text">{localizeWithFallback('help.emergency.abusive.description', item.messages.join('\n'))}</div>
                <div className="octane-abusive-alert__actions">
                    <Button onClick={onClose}>{localizeWithFallback('help.emergency.abusive.close', LocalizeText('generic.close'))}</Button>
                </div>
            </LayoutNotificationAlertView>
        </NativeTextTree>
    );
};
