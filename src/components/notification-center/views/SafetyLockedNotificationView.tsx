import { HabboWebTools } from '@octane/renderer';
import { FC } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../api';
import { useSafetyLockStore } from '../../../hooks/notification/safetyLockStore';

/** The page the Unlock link opens: `link.format.safetylock_unlock` in the official config. */
export const getSafetyLockUnlockUrl = (): string =>
    GetConfigurationValue<string>('link.format.safetylock_unlock', '') || GetConfigurationValue<string>('url.prefix', '');

/**
 * The persistent toolbar notice of a safety-locked account (`safety_locked_notification`,
 * `SafetyLockedNotification`): a 192x80 titled panel attached above the toolbar with the
 * "Account is safety locked" text and an underlined Unlock link opening the website. It
 * stays until the unlock status change arrives.
 */
export const SafetyLockedNotificationView: FC<{}> = () => {
    const isLocked = useSafetyLockStore((state) => state.isLocked);

    if (!isLocked) return null;

    const onUnlock = () => {
        const url = getSafetyLockUnlockUrl();

        if (url) HabboWebTools.openWebPage(url);
    };

    return (
        <div className="octane-safety-locked-notification pointer-events-auto" data-testid="safety-locked-notification">
            <div className="octane-safety-locked-notification__title">{localizeWithFallback('generic.notification_title', 'Notification!')}</div>
            <div className="octane-safety-locked-notification__text">
                {localizeWithFallback(
                    'notifications.text.safety_locked',
                    'Account is safety locked! Some functionality is disabled. Please visit the Habbo website to unlock.'
                )}
            </div>
            <button className="octane-safety-locked-notification__link" type="button" onClick={onUnlock}>
                {localizeWithFallback('notifications.button.safety_locked_unlock', 'Unlock')}
            </button>
        </div>
    );
};
