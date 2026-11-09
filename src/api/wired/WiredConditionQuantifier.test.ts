import { describe, expect, it } from 'vitest';
import {
    hasWiredQuantifier,
    normalizeWiredQuantifier,
    resolveWiredQuantifier,
    WIRED_QUANTIFIER_FURNI,
    WIRED_QUANTIFIER_NONE,
    WIRED_QUANTIFIER_USERS,
    WIRED_QUANTIFIER_VARIABLES,
    wiredQuantifierLabelKey
} from './WiredConditionQuantifier';

describe('condition quantifier (AIR getQuantifierKey)', () => {
    it('labels each family, with .neg. for an inverted condition', () => {
        expect(wiredQuantifierLabelKey(WIRED_QUANTIFIER_FURNI, false, 0)).toBe('wiredfurni.params.quantifier.furni.0');
        expect(wiredQuantifierLabelKey(WIRED_QUANTIFIER_USERS, false, 1)).toBe('wiredfurni.params.quantifier.users.1');
        expect(wiredQuantifierLabelKey(WIRED_QUANTIFIER_USERS, true, 0)).toBe('wiredfurni.params.quantifier.users.neg.0');
        expect(wiredQuantifierLabelKey(WIRED_QUANTIFIER_VARIABLES, true, 1)).toBe('wiredfurni.params.quantifier.variables.neg.1');
    });

    it('has a section only for the furni, users and variables types', () => {
        expect(hasWiredQuantifier(WIRED_QUANTIFIER_NONE)).toBe(false);
        expect(hasWiredQuantifier(undefined)).toBe(false);
        expect(hasWiredQuantifier(4)).toBe(false);
        expect(hasWiredQuantifier(WIRED_QUANTIFIER_FURNI)).toBe(true);
        expect(hasWiredQuantifier(WIRED_QUANTIFIER_VARIABLES)).toBe(true);
    });

    it('sends the edited choice, else the one the box came with, and anything but 1 as all', () => {
        expect(resolveWiredQuantifier(null, 1)).toBe(1);
        expect(resolveWiredQuantifier(0, 1)).toBe(0);
        expect(resolveWiredQuantifier(1, 0)).toBe(1);
        expect(resolveWiredQuantifier(undefined, undefined)).toBe(0);
        expect(normalizeWiredQuantifier(7)).toBe(0);
    });
});
