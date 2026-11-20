import { GetRoomEngine } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { localizeWithFallback } from '../../../api/utils/localizeWithFallback';
import { Checkbox, LayoutNotificationBubbleView } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useWiredToolsState } from '../../../hooks';
import { hasActiveWiredClickSettings, useWiredClickSettingsStore } from '../../../hooks/wired/wiredClickSettingsStore';

const stay = () => undefined;

/**
 * Official WiredEnvironment "wired_click_settings_toggle": while a room has wired click settings, whoever may edit
 * its wired keeps a notice with a switch. Switched on, their own clicks behave as if the room had none, so they
 * can still select the avatars and furni the settings make unclickable.
 */
export const WiredClickSettingsToggleView: FC<{}> = () => {
    const { roomSettings = null } = useWiredToolsState();
    const canWrite = !!roomSettings?.canModify;
    const userOption = useWiredClickSettingsStore((state) => state.userOption);
    const furniOption = useWiredClickSettingsStore((state) => state.furniOption);
    const ignored = useWiredClickSettingsStore((state) => state.ignored);
    const active = hasActiveWiredClickSettings({ userOption, furniOption });

    useEffect(() => {
        const store = useWiredClickSettingsStore.getState();

        store.setCanWrite(canWrite);

        // Losing the right to edit wired also ends the ignoring: the room's settings count again.
        if (!canWrite && store.ignored) {
            store.setIgnored(false);
            GetRoomEngine().setWiredClickSettings(store.userOption, store.furniOption);
        }
    }, [canWrite]);

    if (!canWrite || !active) return null;

    const toggle = (value: boolean) => {
        useWiredClickSettingsStore.getState().setIgnored(value);

        if (value) GetRoomEngine().setWiredClickSettings(0, 0);
        else GetRoomEngine().setWiredClickSettings(userOption, furniOption);
    };

    const label = localizeWithFallback('notification.click_settings.ignore', 'Ignore the click settings');

    return (
        <NativeTextTree>
            <LayoutNotificationBubbleView
                classNames={['octane-notification-item', 'octane-click-settings-toggle']}
                closeOnClick={false}
                fadesOut={false}
                onClose={stay}
            >
                <div className="octane-notification-item__text">
                    <div>
                        {ignored
                            ? localizeWithFallback('notification.click_settings_ignored', 'You are ignoring the click settings.')
                            : localizeWithFallback('notification.click_settings', 'The click settings of this room have changed.')}
                    </div>
                    <label className="octane-click-settings-toggle__switch">
                        <Checkbox aria-label={label} checked={ignored} onCheckedChange={toggle} />
                        <span>{label}</span>
                    </label>
                </div>
            </LayoutNotificationBubbleView>
        </NativeTextTree>
    );
};
