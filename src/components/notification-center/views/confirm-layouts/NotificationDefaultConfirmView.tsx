import { FC } from 'react';
import { NotificationAlertType, NotificationConfirmItem } from '../../../../api';
import { Button, Flex, LayoutNotificationAlertView, LayoutNotificationAlertViewProps, Text } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';

export interface NotificationDefaultConfirmViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationConfirmItem;
}

/* Official habbo_window_confirm: the text, then "cancel" as an underlined link on the left and the
   one confirm button on the right. */
export const NotificationDefaultConfirmView: FC<NotificationDefaultConfirmViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;
    const { message = null, onConfirm = null, onCancel = null, confirmText = null, cancelText = null, title = null } = item;

    const confirm = () => {
        if (onConfirm) onConfirm();

        onClose();
    };

    const cancel = () => {
        if (onCancel) onCancel();

        onClose();
    };

    return (
        <LayoutNotificationAlertView title={title} onClose={onClose} {...rest} type={NotificationAlertType.ALERT}>
            <Flex center grow>
                <Text className="whitespace-pre-line">{message}</Text>
            </Flex>
            <div className="octane-confirm-actions">
                <BaseButton className="octane-confirm-actions__cancel" type="button" onClick={cancel}>
                    {cancelText}
                </BaseButton>
                <Button onClick={confirm}>{confirmText}</Button>
            </div>
        </LayoutNotificationAlertView>
    );
};
