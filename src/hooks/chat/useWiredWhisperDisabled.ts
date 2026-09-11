import { RoomSessionChatEvent, UserSettingsEvent, WiredMenuSettingsComposer } from '@octane/renderer';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { LocalStorageKeys, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useLocalStorage } from '../useLocalStorage';

// The emulator sends every wired whisper with the WIRED bubble (RoomChatMessageBubbles.WIRED, id
// 34) unless the effect was configured with another style, so whisper + style 34 is the only
// client-side signature of a wired whisper.
export const WIRED_CHAT_STYLE_ID = 34;

export const isWiredWhisper = (chatType: number, styleId: number): boolean =>
    chatType === RoomSessionChatEvent.CHAT_TYPE_WHISPER && styleId === WIRED_CHAT_STYLE_ID;

/**
 * The official client saves the switch with the rest of the wired menu preferences
 * (WiredMenuController.sendPreferences, header 1226) and reads it back from the UserSettings packet.
 * The menu/inspect/play-test flags and the ui style of that packet belong to the official wired
 * menu this client does not have, so they travel as their official defaults.
 */
export const composeWiredWhisperPreference = (disabled: boolean) => new WiredMenuSettingsComposer(false, false, false, disabled, false, '');

const useWiredWhisperDisabledState = () => {
    const [storedValue, setStoredValue] = useLocalStorage(LocalStorageKeys.WIRED_WHISPER_DISABLED, false);

    useMessageEvent<UserSettingsEvent>(UserSettingsEvent, (event) => {
        setStoredValue(event.getParser().wiredWhisperDisabled);
    });

    const setDisabled = (disabled: boolean) => {
        setStoredValue(disabled);
        SendMessageComposer(composeWiredWhisperPreference(disabled));
    };

    return [storedValue, setDisabled] as const;
};

export const useWiredWhisperDisabled = () => useSharedHook(useWiredWhisperDisabledState);

registerSharedHook(useWiredWhisperDisabledState);
