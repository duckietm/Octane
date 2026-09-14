import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import {
    FRIEND_ONLINE_NOTIFY_EVERYONE,
    FRIEND_ONLINE_NOTIFY_NOBODY,
    FRIEND_ONLINE_NOTIFY_RELATIONSHIPS,
    useFriendOnlineNotificationPreference,
    useWiredWhisperDisabled
} from '../../hooks';

// The wired whisper checkbox and the friend-online drop-menu of the official me_menu_other_settings
// layout (OtherSettingsView). Both are saved server-side through the official packets (wired menu
// preferences 1226 and SetOnlineIndicatorPreference 818) and read back from the UserSettings packet.
export const UserOtherPreferencesView: FC<{}> = () => {
    const [wiredWhisperDisabled, setWiredWhisperDisabled] = useWiredWhisperDisabled();
    const [friendOnlinePreference, setFriendOnlinePreference] = useFriendOnlineNotificationPreference();

    const friendOnlineLabel = localizeWithFallback('memenu.settings.other.friend.online.notification.title', 'Notify me when a friend comes online');

    return (
        <>
            <label className="air-settings-check-row">
                <input
                    checked={wiredWhisperDisabled}
                    className="air-settings-checkbox"
                    type="checkbox"
                    onChange={(event) => setWiredWhisperDisabled(event.target.checked)}
                />
                <span>{localizeWithFallback('memenu.settings.wired_whisper_read_disable', 'Disable wired whispers')}</span>
            </label>
            <label className="air-settings-select-row">
                <span>{friendOnlineLabel}</span>
                <select
                    aria-label={friendOnlineLabel}
                    value={friendOnlinePreference}
                    onChange={(event) => setFriendOnlinePreference(Number(event.target.value))}
                >
                    <option value={FRIEND_ONLINE_NOTIFY_EVERYONE}>
                        {localizeWithFallback('memenu.settings.other.friend.online.notification.0', 'Everyone')}
                    </option>
                    <option value={FRIEND_ONLINE_NOTIFY_RELATIONSHIPS}>
                        {localizeWithFallback('memenu.settings.other.friend.online.notification.1', 'Users in my relationship status')}
                    </option>
                    <option value={FRIEND_ONLINE_NOTIFY_NOBODY}>{localizeWithFallback('memenu.settings.other.friend.online.notification.2', 'Nobody')}</option>
                </select>
            </label>
        </>
    );
};
