import { RoomSessionChatEvent } from '@octane/renderer';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { LocalStorageKeys } from '../../api';
import { useLocalStorage } from '../useLocalStorage';

// The emulator sends every wired whisper with the WIRED bubble (RoomChatMessageBubbles.WIRED, id
// 34) unless the effect was configured with another style, so whisper + style 34 is the only
// client-side signature of a wired whisper.
export const WIRED_CHAT_STYLE_ID = 34;

export const isWiredWhisper = (chatType: number, styleId: number): boolean =>
    chatType === RoomSessionChatEvent.CHAT_TYPE_WHISPER && styleId === WIRED_CHAT_STYLE_ID;

const useWiredWhisperDisabledState = () => useLocalStorage(LocalStorageKeys.WIRED_WHISPER_DISABLED, false);

export const useWiredWhisperDisabled = () => useSharedHook(useWiredWhisperDisabledState);

registerSharedHook(useWiredWhisperDisabledState);
