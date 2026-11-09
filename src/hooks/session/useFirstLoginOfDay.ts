import { GetSessionDataManager, IsFirstLoginOfDayEvent } from '@octane/renderer';
import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { useMessageEvent } from '../events';

/**
 * Consumes `IsFirstLoginOfDayComposer` (header 793), pushed once during
 * the login handshake.
 *
 * The flag is what the quest engine keys off (the seasonal calendar opens
 * itself on the first login of a day). The packet arrives in the login
 * burst, before this hook mounts, so the session data manager keeps it
 * and seeds the state; `isFirstLoginOfDay` is null on a renderer that
 * does not keep it, until the server speaks again.
 */
const readStoredFirstLoginOfDay = (): boolean => {
    const manager = GetSessionDataManager?.();
    const value = manager ? (manager as { isFirstLoginOfDay?: boolean }).isFirstLoginOfDay : undefined;

    return typeof value === 'boolean' ? value : null;
};

const useFirstLoginOfDayState = () => {
    const [isFirstLoginOfDay, setIsFirstLoginOfDay] = useState<boolean>(readStoredFirstLoginOfDay);

    useMessageEvent<IsFirstLoginOfDayEvent>(IsFirstLoginOfDayEvent, event => {
        setIsFirstLoginOfDay(event.getParser().isFirstLoginOfDay);
    });

    return { isFirstLoginOfDay };
};

export const useFirstLoginOfDay = () => useSharedHook(useFirstLoginOfDayState);

registerSharedHook(useFirstLoginOfDayState);
