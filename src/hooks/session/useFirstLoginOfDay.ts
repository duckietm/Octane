import { IsFirstLoginOfDayEvent } from '@octane/renderer';
import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { useMessageEvent } from '../events';

/**
 * Consumes `IsFirstLoginOfDayComposer` (header 793), pushed once during
 * the login handshake.
 *
 * The flag is what the quest engine and daily-reward flows key off. No
 * such flow exists in this client yet, so the hook simply makes the
 * answer available: `isFirstLoginOfDay` is null until the server has
 * spoken, then true or false.
 */
const useFirstLoginOfDayState = () => {
    const [isFirstLoginOfDay, setIsFirstLoginOfDay] = useState<boolean>(null);

    useMessageEvent<IsFirstLoginOfDayEvent>(IsFirstLoginOfDayEvent, event => {
        setIsFirstLoginOfDay(event.getParser().isFirstLoginOfDay);
    });

    return { isFirstLoginOfDay };
};

export const useFirstLoginOfDay = () => useSharedHook(useFirstLoginOfDayState);

registerSharedHook(useFirstLoginOfDayState);
