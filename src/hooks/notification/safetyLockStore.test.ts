import { beforeEach, describe, expect, it } from 'vitest';
import { isSafetyLockedStatus, SAFETY_LOCK_STATUS_LOCKED, SAFETY_LOCK_STATUS_UNLOCKED, useSafetyLockStore } from './safetyLockStore';

beforeEach(() => useSafetyLockStore.setState({ isLocked: false }));

describe('safety lock status', () => {
    it('locks on the locked status and unlocks on the unlocked one', () => {
        expect(isSafetyLockedStatus(SAFETY_LOCK_STATUS_LOCKED)).toBe(true);
        expect(isSafetyLockedStatus(SAFETY_LOCK_STATUS_UNLOCKED)).toBe(false);
    });

    it('keeps the flag the toolbar notice reads', () => {
        useSafetyLockStore.getState().setLocked(true);
        expect(useSafetyLockStore.getState().isLocked).toBe(true);

        useSafetyLockStore.getState().setLocked(false);
        expect(useSafetyLockStore.getState().isLocked).toBe(false);
    });
});
