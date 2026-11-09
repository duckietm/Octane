import { GetConfiguration, GetSessionDataManager } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { GetConfigurationValue } from '../../api';

const SHOWN_KEY = 'nux.chat.reminder.shown';
/** RoomChatInputView: the chat bar wiggles ten times, 500 ms apart. */
export const NUX_CHAT_REMINDER_WIGGLE_MS = 5000;

/**
 * AIR RoomChatInputView.highlightChatInput: a new user who has not chatted for
 * `nux.noob.chat.reminder.delay` seconds (240) gets "you can type here" in the chat bar, which
 * wiggles under a hint. It happens once per session (`nux.chat.reminder.shown`).
 */
export const useNuxChatReminder = (hasTyped: boolean) => {
    const [reminding, setReminding] = useState(false);
    const [wiggling, setWiggling] = useState(false);
    const typedRef = useRef(false);

    useEffect(() => {
        const session = GetSessionDataManager();

        if (hasTyped) typedRef.current = true;
        if (typedRef.current || !(session?.isNoob || session?.isRealNoob)) return;
        if (GetConfigurationValue<string>(SHOWN_KEY, '') === '1') return;

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
            GetConfiguration().setValue(SHOWN_KEY, '1');
        }, NUX_CHAT_REMINDER_WIGGLE_MS);

        return () => window.clearTimeout(timeout);
    }, [wiggling]);

    /** Focusing the chat bar clears the reminder text. */
    const dismiss = () => {
        if (!reminding) return;

        GetConfiguration().setValue(SHOWN_KEY, '1');
        setReminding(false);
        setWiggling(false);
    };

    return { reminding, wiggling, dismiss };
};
