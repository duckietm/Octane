import { describe, expect, it } from 'vitest';
import { CHAT_MODE_FREE_FLOW, CHAT_MODE_LINE_BY_LINE, resolveChatMode } from './resolveChatMode';

describe('resolveChatMode', () => {
    it('uses line by line when the room or the user asks for it', () => {
        expect(resolveChatMode(CHAT_MODE_FREE_FLOW, CHAT_MODE_FREE_FLOW)).toBe(CHAT_MODE_FREE_FLOW);
        expect(resolveChatMode(CHAT_MODE_LINE_BY_LINE, CHAT_MODE_FREE_FLOW)).toBe(CHAT_MODE_LINE_BY_LINE);
        expect(resolveChatMode(CHAT_MODE_FREE_FLOW, CHAT_MODE_LINE_BY_LINE)).toBe(CHAT_MODE_LINE_BY_LINE);
    });
});
