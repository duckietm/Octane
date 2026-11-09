import { describe, expect, it } from 'vitest';
import { addSilencedUserId, normalizeSilencedUserIds } from './soundboardSilencedUsers';

describe('soundboard silenced users', () => {
    it('keeps positive unique integer ids only', () => {
        expect(normalizeSilencedUserIds([3, 3, -1, 0, 1.5, '4', 7])).toEqual([3, 7]);
        expect(normalizeSilencedUserIds('nope')).toEqual([]);
    });

    it('adds a user once', () => {
        expect(addSilencedUserId([1, 2], 3)).toEqual([1, 2, 3]);
        expect(addSilencedUserId([1, 2, 3], 2)).toEqual([1, 2, 3]);
    });

    it('stops growing at the limit', () => {
        const full = Array.from({ length: 200 }, (_, index) => index + 1);

        expect(addSilencedUserId(full, 201)).toHaveLength(200);
    });
});
