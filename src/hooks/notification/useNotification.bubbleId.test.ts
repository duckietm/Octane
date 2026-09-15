import { describe, expect, it } from 'vitest';
import { NotificationBubbleItem, NotificationBubbleType } from '../../api';
import { hasBubbleWithId, removeBubblesById } from './useNotification';

describe('Bubble ids (NotificationExtraDataKey.ID)', () => {
    const withId = (id: string) => new NotificationBubbleItem('Wired', NotificationBubbleType.INFO, null, null, '', { id });

    it('finds a bubble on screen by the id the server sent', () => {
        const plain = new NotificationBubbleItem('Info', NotificationBubbleType.INFO);

        expect(hasBubbleWithId([plain, withId('wired_click_settings_toggle')], 'wired_click_settings_toggle')).toBe(true);
        expect(hasBubbleWithId([plain], 'wired_click_settings_toggle')).toBe(false);
        expect(hasBubbleWithId([plain], null)).toBe(false);
    });

    it('retracts every bubble carrying the id and leaves the rest', () => {
        const plain = new NotificationBubbleItem('Info', NotificationBubbleType.INFO);
        const remaining = removeBubblesById([withId('a'), plain, withId('a')], 'a');

        expect(remaining).toEqual([plain]);
        expect(removeBubblesById([plain], null)).toEqual([plain]);
    });

    it('reads stay and time_display from the extras', () => {
        const staying = new NotificationBubbleItem('Stay', NotificationBubbleType.INFO, null, null, '', { stay: true });
        const quick = new NotificationBubbleItem('Quick', NotificationBubbleType.INFO, null, null, '', { timeDisplayMs: 2500 });
        const plain = new NotificationBubbleItem('Plain', NotificationBubbleType.INFO);

        expect(staying.staysVisible).toBe(true);
        expect(quick.timeDisplayMs).toBe(2500);
        expect(plain.staysVisible).toBe(false);
        expect(plain.timeDisplayMs).toBeNull();
        expect(plain.notificationId).toBeNull();
    });
});
