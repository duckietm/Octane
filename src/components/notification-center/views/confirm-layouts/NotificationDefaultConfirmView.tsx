import { CSSProperties, FC } from 'react';
import { NotificationAlertType, NotificationConfirmItem } from '../../../../api';
import { Button, LayoutNotificationAlertView, LayoutNotificationAlertViewProps } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export interface NotificationDefaultConfirmViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationConfirmItem;
}

/* Official habbo_window_confirm: a 300 px window, the u_regular 12 text top left (253 px wide), then "cancel"
   as an underlined link on the left and the one 28 px button_thick confirm button on the right. A caller can colour the title bar like AIR's
   titleBarColor (the destructive wired confirms use red). */
export const NotificationDefaultConfirmView: FC<NotificationDefaultConfirmViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;
    const { message = null, onConfirm = null, onCancel = null, confirmText = null, cancelText = null, title = null, titleBarColor = null } = item;

    const confirm = () => {
        if (onConfirm) onConfirm();

        onClose();
    };

    const cancel = () => {
        if (onCancel) onCancel();

        onClose();
    };

    return (
        <NativeTextTree>
            <LayoutNotificationAlertView
                title={title}
                onClose={onClose}
                classNames={['octane-confirm-window']}
                style={titleBarColor ? ({ '--octane-confirm-title-bar': titleBarColor } as CSSProperties) : undefined}
                {...rest}
                type={NotificationAlertType.ALERT}
            >
                <div className="octane-confirm-window__text whitespace-pre-line">{message}</div>
                <div className="octane-confirm-actions">
                    <BaseButton className="octane-confirm-actions__cancel" type="button" onClick={cancel}>
                        {cancelText}
                    </BaseButton>
                    <Button onClick={confirm}>{confirmText}</Button>
                </div>
            </LayoutNotificationAlertView>
        </NativeTextTree>
    );
};
