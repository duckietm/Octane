import { describe, expect, it } from 'vitest';
import { getGroupFailureFallback, getGroupFailureTextKey, getGroupFailureTitleKey } from './GroupFailureTexts';

describe('GroupFailureTexts', () => {
    it('builds the official keys', () => {
        expect(getGroupFailureTextKey('edit', 2)).toBe('group.edit.fail.2');
        expect(getGroupFailureTextKey('join', 2)).toBe('group.joinfail.2');
        expect(getGroupFailureTitleKey('membermgmt')).toBe('group.membermgmt.fail.title');
    });

    it('falls back to readable English', () => {
        expect(getGroupFailureFallback('join', 2)).toBe('This group is closed.');
        expect(getGroupFailureFallback('edit', 99)).toContain('went wrong');
    });
});
