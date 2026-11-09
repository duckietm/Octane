import { describe, expect, it } from 'vitest';
import { applyUserChatPreferences } from './applyUserChatPreferences';

const room = { mode: 0, weight: 0, speed: 2, distance: 50, protection: 1 };

describe('applyUserChatPreferences', () => {
    it('keeps the room settings when the user left both on normal', () => {
        expect(applyUserChatPreferences(room, 1, 1)).toBe(room);
    });

    it('uses the user width and speed they picked', () => {
        expect(applyUserChatPreferences(room, 2, 0)).toEqual({ ...room, weight: 2, speed: 0 });
    });

    it('ignores unknown values', () => {
        expect(applyUserChatPreferences(room, 7, -1)).toBe(room);
    });
});
