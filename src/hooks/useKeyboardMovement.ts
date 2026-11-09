import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { LocalStorageKeys } from '../api';
import { useLocalStorage } from './useLocalStorage';

const useKeyboardMovementState = () => useLocalStorage(LocalStorageKeys.KEYBOARD_MOVEMENT, false);

export const useKeyboardMovement = () => useSharedHook(useKeyboardMovementState);

registerSharedHook(useKeyboardMovementState);
