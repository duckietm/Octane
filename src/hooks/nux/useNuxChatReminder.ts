import { GetSessionDataManager } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { GetConfigurationValue } from '../../api';

// Shown once per session: kept in sessionStorage, not in the hotel's configuration.
const SHOWN_KEY = 'octane.nux.chat.reminder.shown';

const wasShown = (): boolean => {
    try {
        return window.sessionStorage.getItem(SHOWN_KEY) === '1';
    } catch {
        return false;
    }
};

const markShown = (): void => {
    try {
        window.sessionStorage.setItem(SHOWN_KEY, '1');
    } catch {}
};
/** RoomChatInputView: the chat bar wiggles ten times, 500 ms apart. */
export const NUX_CHAT_REMINDER_WIGGLE_MS = 5000;

/**
 * AIR RoomChatInputView.highlightChatInput: a new user who has not chatted for
 * `nux.noob.chat.reminder.delay` seconds (240) gets "you can type here" in the chat bar, which
 * wiggles under a hint. It happens once per session.
 */
export const useNuxChatReminder = (hasTyped: boolean) => {
    const [reminding, setReminding] = useState(false);
    const [wiggling, setWiggling] = useState(false);
    const typedRef = useRef(false);

    useEffect(() => {
        const session = GetSessionDataManager();

        if (hasTyped) typedRef.current = true;
        if (typedRef.current || !(session?.isNoob || session?.isRealNoob)) return;
        if (wasShown()) return;

        const delay = GetConfigurationValue<number>('nux.noob.chat.reminder.delay', 240) * 1000;
        const timeout = window.setTimeout(() => {
            setReminding(true);
            setWiggling(true);
        }, delay);

        return () => window.clearTimeout(timeout);
    }, [hasTyped]);

    // chatBarReminderShown: after the wiggle the hint goes and the reminder never comes back.
    useEffect(() => {
        if (!wiggling) return;

        const timeout = window.setTimeout(() => {
            setWiggling(false);
            markShown();
        }, NUX_CHAT_REMINDER_WIGGLE_MS);

        return () => window.clearTimeout(timeout);
    }, [wiggling]);

    /** Focusing the chat bar clears the reminder text. */
    const dismiss = () => {
        if (!reminding) return;

        markShown();
        setReminding(false);
        setWiggling(false);
    };

    return { reminding, wiggling, dismiss };
};
