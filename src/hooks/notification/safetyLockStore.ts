import { createOctaneStore } from '@/state/createOctaneStore';

/** The values of `AccountSafetyLockStatusChange`: 0 locks the account, 1 unlocks it. */
export const SAFETY_LOCK_STATUS_LOCKED = 0;
export const SAFETY_LOCK_STATUS_UNLOCKED = 1;

interface SafetyLockState {
    /** Whether the account is safety locked and the toolbar shows the unlock notice. */
    isLocked: boolean;
    setLocked: (locked: boolean) => void;
}

/**
 * The official `SafetyLockedNotification` sits attached to the toolbar for as long as the
 * account is locked (`SingularNotificationController.showSafetyLockedNotification`) and goes
 * away on the unlock status change; this store carries that one flag.
 */
export const useSafetyLockStore = createOctaneStore<SafetyLockState>()((set) => ({
    isLocked: false,
    setLocked: (locked) => set({ isLocked: locked })
}));

/** Maps the status of the packet to the flag; anything but the unlock value locks. */
export const isSafetyLockedStatus = (status: number): boolean => status !== SAFETY_LOCK_STATUS_UNLOCKED;
