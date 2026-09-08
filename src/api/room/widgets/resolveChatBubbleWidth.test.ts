import { describe, expect, it } from 'vitest';
import { resolveChatBubbleWidth } from './resolveChatBubbleWidth';

/** Widths as the room setting names them: 0 wide, 1 normal, 2 thin. -1 means "no override". */
describe('resolveChatBubbleWidth', () => {
    it('uses the room setting when the message carries no override', () => {
        expect(resolveChatBubbleWidth(-1, 1)).toBe(1);
        expect(resolveChatBubbleWidth(undefined, 2)).toBe(2);
    });

    it('lets a wired message override the room setting', () => {
        expect(resolveChatBubbleWidth(0, 1)).toBe(0);
        expect(resolveChatBubbleWidth(2, 0)).toBe(2);
    });

    it('ignores an override that names no width', () => {
        expect(resolveChatBubbleWidth(3, 1)).toBe(1);
        expect(resolveChatBubbleWidth(-7, 0)).toBe(0);
    });
});
