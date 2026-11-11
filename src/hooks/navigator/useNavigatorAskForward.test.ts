// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { askForwardRoomId } from './useNavigatorAskForward';

describe('navigator/ask_forward', () => {
    it('reads the room id of the link', () => {
        expect(askForwardRoomId('1234')).toBe(1234);
        expect(askForwardRoomId(' 1234 ')).toBe(1234);
    });

    it('refuses anything that is not a room id', () => {
        expect(askForwardRoomId('home')).toBe(0);
        expect(askForwardRoomId('12abc')).toBe(0);
        expect(askForwardRoomId('0')).toBe(0);
        expect(askForwardRoomId('-5')).toBe(0);
        expect(askForwardRoomId('')).toBe(0);
        expect(askForwardRoomId(undefined)).toBe(0);
    });
});
