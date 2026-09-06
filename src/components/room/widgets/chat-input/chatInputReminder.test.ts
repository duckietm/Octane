import { describe, expect, it } from 'vitest';
import { CHAT_REMINDER_DISMISSED_KEY, markChatReminderDismissed, shouldShowChatReminder } from './chatInputReminder';

const memoryStorage = () => {
    const values = new Map<string, string>();

    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => void values.set(key, value)
    };
};

describe('chat input reminder', () => {
    it('shows the reminder until the first line has been sent', () => {
        const storage = memoryStorage();

        expect(shouldShowChatReminder(storage)).toBe(true);

        markChatReminderDismissed(storage);

        expect(storage.getItem(CHAT_REMINDER_DISMISSED_KEY)).toBe('1');
        expect(shouldShowChatReminder(storage)).toBe(false);
    });

    it('stays quiet when the storage is not available', () => {
        const broken = {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('blocked');
            }
        };

        expect(shouldShowChatReminder(broken)).toBe(false);
        expect(() => markChatReminderDismissed(broken)).not.toThrow();
    });
});
