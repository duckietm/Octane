import { describe, expect, it } from 'vitest';
import { formatProfileValue, isProfileHiddenFromViewer } from './profileVisibility';

describe('isProfileHiddenFromViewer', () => {
    it('hides a hidden profile the server cut for this viewer', () => {
        expect(isProfileHiddenFromViewer({ id: 7, isHidden: true, friendsCount: -1 }, 8)).toBe(true);
    });

    it('shows the owner their own profile', () => {
        expect(isProfileHiddenFromViewer({ id: 7, isHidden: true, friendsCount: 12 }, 7)).toBe(false);
    });

    it('shows a moderator the full data the server sent', () => {
        expect(isProfileHiddenFromViewer({ id: 7, isHidden: true, friendsCount: 12 }, 8)).toBe(false);
    });

    it('shows profiles that are not hidden', () => {
        expect(isProfileHiddenFromViewer({ id: 7, isHidden: false, friendsCount: 0 }, 8)).toBe(false);
        expect(isProfileHiddenFromViewer(null, 8)).toBe(false);
    });
});

describe('formatProfileValue', () => {
    it('shows a dash for hidden or left-out values', () => {
        expect(formatProfileValue(5, true)).toBe('-');
        expect(formatProfileValue(-1, false)).toBe('-');
    });

    it('formats visible values', () => {
        expect(formatProfileValue(0, false)).toBe('0');
        expect(formatProfileValue(90, false, (value) => `${value}s`)).toBe('90s');
    });
});
