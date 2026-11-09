/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { NotificationBubbleType } from '../../../../api';
import { getBubbleIcon, getBubbleLink } from './bubbleDefaults';

describe('bubble defaults', () => {
    it('gives a style its icon only when the server sent none', () => {
        expect(getBubbleIcon(NotificationBubbleType.CLUB, null)).toBeTruthy();
        expect(getBubbleIcon(NotificationBubbleType.CLUB, 'custom.png')).toBe('custom.png');
        expect(getBubbleIcon(NotificationBubbleType.PETLEVEL, null)).toBeNull();
    });

    it('opens the pets, or the friends list, when the server sent no link', () => {
        expect(getBubbleLink(NotificationBubbleType.PETLEVEL, null)).toBe('inventory/show/pets');
        expect(getBubbleLink(NotificationBubbleType.FRIENDOFFLINE, '')).toBe('friends/show');
        expect(getBubbleLink(NotificationBubbleType.PETLEVEL, 'navigator/goto/1')).toBe('navigator/goto/1');
        expect(getBubbleLink(NotificationBubbleType.INFO, null)).toBeNull();
    });
});
