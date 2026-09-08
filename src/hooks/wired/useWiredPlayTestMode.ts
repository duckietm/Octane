import { WiredMenuSettingsComposer } from '@octane/renderer';
import { GetLocalStorage, localizeWithFallback, SendMessageComposer, SetLocalStorage } from '../../api';
import { createOctaneStore } from '../../state/createOctaneStore';

/**
 * The wired play-test switch of the official wired menu (`WiredMenuController.setPlayTestMode`,
 * toggled by `:playtest` in `ChatInputWidgetHandler.as:506`). The official keeps it with the other
 * wired menu preferences (header 1226, `WiredMenuSettingsComposer`) and shows an info notification
 * on every change; this client has no wired menu, so the flag lives here and in the browser.
 */
const PLAY_TEST_STORAGE_KEY = 'octane.wired.playTestMode';

interface WiredPlayTestStore {
    isPlayTestMode: boolean;
    setPlayTestMode: (enabled: boolean) => void;
}

const readStoredPlayTestMode = (): boolean => {
    try {
        return GetLocalStorage<boolean>(PLAY_TEST_STORAGE_KEY) === true;
    } catch {
        return false;
    }
};

export const useWiredPlayTestStore = createOctaneStore<WiredPlayTestStore>()((set) => ({
    isPlayTestMode: readStoredPlayTestMode(),
    setPlayTestMode: (enabled) => {
        set({ isPlayTestMode: enabled });

        try {
            SetLocalStorage(PLAY_TEST_STORAGE_KEY, enabled);
        } catch {
            // Storage may be unavailable; the flag still holds for this session.
        }
    }
}));

// `WiredMenuController.sendPreferences`: menu button, inspect button, play test, whisper disabled,
// show all notifications, ui style. Only the play-test and whisper flags are known here.
export const composeWiredPlayTestPreference = (playTestMode: boolean, wiredWhisperDisabled: boolean) =>
    new WiredMenuSettingsComposer(false, false, playTestMode, wiredWhisperDisabled, false, '');

export const getPlayTestNotificationText = (enabled: boolean): string =>
    enabled
        ? localizeWithFallback('wiredmenu.settings.preferences.notification.playtest.enabled', 'Wired play-test mode enabled')
        : localizeWithFallback('wiredmenu.settings.preferences.notification.playtest.disabled', 'Wired play-test mode disabled');

/**
 * Flips the flag, persists it, sends the preference and returns the notification text the caller
 * shows (official: `roomEvents.notifications.addItem(..., "info", ...)`).
 */
export const switchWiredPlayTestMode = (wiredWhisperDisabled: boolean): { isPlayTestMode: boolean; notification: string } => {
    const store = useWiredPlayTestStore.getState();
    const next = !store.isPlayTestMode;

    store.setPlayTestMode(next);
    SendMessageComposer(composeWiredPlayTestPreference(next, wiredWhisperDisabled));

    return { isPlayTestMode: next, notification: getPlayTestNotificationText(next) };
};

export const useWiredPlayTestMode = () => useWiredPlayTestStore((state) => state.isPlayTestMode);
