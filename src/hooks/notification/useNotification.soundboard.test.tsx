import { describe, expect, it } from 'vitest';
import { NotificationBubbleItem, NotificationBubbleType } from '../../api';
import { addSingleBubble } from './useNotification';

describe('Soundboard notification bubbles', () => {
    it('replaces only the previous Soundboard bubble', () => {
        const info = new NotificationBubbleItem('Info', NotificationBubbleType.INFO);
        const previous = new NotificationBubbleItem('Wait 10', NotificationBubbleType.SOUNDBOARD);
        const next = new NotificationBubbleItem('Wait 9', NotificationBubbleType.SOUNDBOARD);

        expect(addSingleBubble([previous, info], next).map((item) => item.message)).toEqual(['Info', 'Wait 9']);
    });
});
