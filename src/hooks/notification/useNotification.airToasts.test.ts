// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { blockResultNotification, chatStyleNotification } from './useNotification';

describe('AIR info bubbles', () => {
    it('tells a block from an unblock and stays silent for other results', () => {
        expect(blockResultNotification(1)).toBe('You have blocked this player.');
        expect(blockResultNotification(0)).toBe('You have unblocked this player.');
        expect(blockResultNotification(-1)).toBeNull();
        expect(blockResultNotification(2)).toBeNull();
    });

    it('tells an added chat style from a removed one', () => {
        expect(chatStyleNotification(true)).toBe('You received a new chat bubble!');
        expect(chatStyleNotification(false)).toBe('This chat bubble has been removed.');
    });
});
