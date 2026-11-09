import { describe, expect, it } from 'vitest';
import { getMessengerIconState, MessengerIconState } from './MessengerIconState';

describe('getMessengerIconState (AIR friend bar messenger icon)', () => {
    it('hides the icon while no conversation is open, whatever is unread', () => {
        expect(getMessengerIconState(0, true, false)).toBe(MessengerIconState.HIDDEN);
    });

    it('blinks for an unread conversation until the icon is clicked', () => {
        expect(getMessengerIconState(2, true, false)).toBe(MessengerIconState.UNREAD);
        expect(getMessengerIconState(2, true, true)).toBe(MessengerIconState.SHOW);
        expect(getMessengerIconState(2, false, false)).toBe(MessengerIconState.SHOW);
    });
});
