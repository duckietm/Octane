import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { LocalStorageKeys } from '../api';
import { useLocalStorage } from './useLocalStorage';

const useChatWindowState = () => useLocalStorage(LocalStorageKeys.CHAT_WINDOW_ENABLED, false);

export const useChatWindow = () => useSharedHook(useChatWindowState);

registerSharedHook(useChatWindowState);
