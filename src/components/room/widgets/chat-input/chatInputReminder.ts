/**
 * The official client nudges a new user with "You can type here to talk!"
 * above the chat input until they send their first line. The client has no
 * account-age signal, so "new" means this browser never sent a line yet.
 */
export const CHAT_REMINDER_DISMISSED_KEY = 'octane.chat.reminder_dismissed';

type ReminderStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const shouldShowChatReminder = (storage: ReminderStorage): boolean => {
    try {
        return storage.getItem(CHAT_REMINDER_DISMISSED_KEY) !== '1';
    } catch {
        // Storage can be blocked (private mode, quota); no reminder is better than a crash.
        return false;
    }
};

export const markChatReminderDismissed = (storage: ReminderStorage): void => {
    try {
        storage.setItem(CHAT_REMINDER_DISMISSED_KEY, '1');
    } catch {
        // Nothing to do: the reminder just shows again next time.
    }
};
