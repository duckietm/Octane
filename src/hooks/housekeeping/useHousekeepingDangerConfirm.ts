import { useCallback } from 'react';
import { LocalizeText } from '../../api';
import { useHousekeepingStore } from './useHousekeepingStore';

/**
 * Second step for the actions that cannot be taken back: the panel shows a
 * dialog where the operator types the target (room id, username, count)
 * before the action runs. Plain confirmations stay on useHousekeepingConfirm.
 */
export const useHousekeepingDangerConfirm = () => {
    const { setDangerRequest } = useHousekeepingStore();

    return useCallback(
        (message: string, expected: string, onConfirm: () => void, confirmLabel?: string) =>
            setDangerRequest({ message, expected, onConfirm, confirmLabel: confirmLabel ?? LocalizeText('housekeeping.confirm.proceed') }),
        [setDangerRequest]
    );
};
