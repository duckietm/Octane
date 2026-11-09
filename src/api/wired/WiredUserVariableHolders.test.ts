import { describe, expect, it } from 'vitest';
import { decodeUserVariableHolder, findUserVariableHolderData, userVariableHolderKey } from './WiredUserVariableHolders';

describe('user variable holder keys', () => {
    it('matches the server keys for users, pets and bots', () => {
        expect(userVariableHolderKey('user', 7)).toBe(7);
        expect(userVariableHolderKey('pet', 7)).toBe(-14);
        expect(userVariableHolderKey('bot', 7)).toBe(-15);
        expect(userVariableHolderKey('rentable_bot', 7)).toBe(-15);
        expect(userVariableHolderKey('bot', -7)).toBe(-15);
        expect(userVariableHolderKey('pet', -7)).toBe(0);
        expect(userVariableHolderKey('pet', 0)).toBe(0);
    });

    it('decodes a key back to its holder', () => {
        expect(decodeUserVariableHolder(7)).toEqual({ kind: 'user', id: 7 });
        expect(decodeUserVariableHolder(-14)).toEqual({ kind: 'pet', id: 7 });
        expect(decodeUserVariableHolder(-15)).toEqual({ kind: 'bot', id: 7 });
        expect(decodeUserVariableHolder(0)).toBeNull();
    });

    it('looks the holder up with the getter of its kind', () => {
        const source = {
            getUserData: (id: number) => (id === 7 ? 'user 7' : null),
            getPetData: (id: number) => (id === 7 ? 'pet 7' : null),
            getBotData: () => null,
            getRentableBotData: (id: number) => (id === -7 ? 'rentable 7' : null)
        };

        expect(findUserVariableHolderData(source, 7)).toBe('user 7');
        expect(findUserVariableHolderData(source, -14)).toBe('pet 7');
        expect(findUserVariableHolderData(source, -15)).toBe('rentable 7');
        expect(findUserVariableHolderData(null, 7)).toBeNull();
    });
});
