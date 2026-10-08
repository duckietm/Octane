import { describe, expect, it } from 'vitest';
import { findLookalikeNames, isLookalikeName } from './TradeNameScam';

describe('isLookalikeName', () => {
    it('matches confusable characters', () => {
        expect(isLookalikeName('B0b', 'Bob')).toBe(true);
        expect(isLookalikeName('Wil1iam', 'William')).toBe(true);
        expect(isLookalikeName('Ågge', 'Agge')).toBe(true);
    });

    it('matches up to two case-only changes', () => {
        expect(isLookalikeName('bob', 'Bob')).toBe(true);
        expect(isLookalikeName('bOb', 'Bob')).toBe(true);
        expect(isLookalikeName('bOB', 'Bob')).toBe(false);
        expect(isLookalikeName('alex', 'ALEX')).toBe(false);
    });

    it('matches up to two left-out small punctuation marks', () => {
        expect(isLookalikeName('Bob.', 'Bob')).toBe(true);
        expect(isLookalikeName('B.o.b', 'Bob')).toBe(true);
        expect(isLookalikeName('B.o.b.', 'Bob')).toBe(false);
    });

    it('does not match the same name, different names or unusual characters', () => {
        expect(isLookalikeName('Bob', 'Bob')).toBe(false);
        expect(isLookalikeName('Bob', 'Rob')).toBe(false);
        expect(isLookalikeName('Bob', 'Bobby')).toBe(false);
        expect(isLookalikeName('Bob★', 'Bob')).toBe(false);
    });
});

describe('findLookalikeNames', () => {
    it('lists each lookalike once', () => {
        expect(findLookalikeNames('B0b', ['Bob', 'Alice', 'Bob', 'B0b', 'bob'])).toEqual(['Bob', 'bob']);
    });
});
