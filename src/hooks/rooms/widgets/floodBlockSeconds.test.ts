/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { floodBlockSeconds } from './useChatInputState';

describe('floodBlockSeconds', () => {
    it('reads the seconds the server sent, rounded up', () => {
        expect(floodBlockSeconds('30')).toBe(30);
        expect(floodBlockSeconds('2.4')).toBe(3);
    });

    it('is 0 for a message that is not a positive number', () => {
        expect(floodBlockSeconds('soon')).toBe(0);
        expect(floodBlockSeconds('')).toBe(0);
        expect(floodBlockSeconds('-5')).toBe(0);
    });
});
