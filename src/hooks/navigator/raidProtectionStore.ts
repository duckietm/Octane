import { createOctaneStore } from '../../state/createOctaneStore';

/** The ban lengths the panel offers, in seconds. The server accepts only these. */
export const RAID_BAN_DURATIONS: number[] = [300, 900, 1800, 3600, 10800, 21600, 43200, 86400, 259200, 604800];

/** The guard lengths the panel offers, in seconds. */
export const RAID_GUARD_DURATIONS: number[] = [300, 900, 1800, 3600, 10800];

export const RAID_SENSITIVITY_LOW = 0;
export const RAID_SENSITIVITY_MEDIUM = 1;
export const RAID_SENSITIVITY_HIGH = 2;

export const RAID_ACTION_KICK = 0;
export const RAID_ACTION_TEMPORARY_BAN = 1;

/** Everything the panel can edit. Kept apart from the state fields below on purpose. */
export interface IRaidProtectionEditable {
    enabled: boolean;
    detectionSensitivity: number;
    actionType: number;
    banDurationSeconds: number;
    guardEnabled: boolean;
    guardDurationSeconds: number;
    guardSensitivity: number;
}

export interface IRaidProtectionSettings extends IRaidProtectionEditable {
    roomId: number;
    /** Whether a raid is under way right now. State, not a setting. */
    incidentActive: boolean;
    /** Epoch seconds of the last raid, 0 when the room has never been raided. */
    lastRaidAtEpochSeconds: number;
}

export interface RaidProtectionState {
    /** The room the server said this user may manage, or 0. Cleared on leaving it. */
    manageableRoomId: number;
    settings: IRaidProtectionSettings | null;
    /** A save is in flight; the panel disables its button until the answer arrives. */
    saving: boolean;
    /** Set while the "you are turning this on" confirmation is up. */
    pendingConfirmation: IRaidProtectionEditable | null;

    setCapability(roomId: number, canManage: boolean): void;
    setSettings(settings: IRaidProtectionSettings): void;
    setSaving(saving: boolean): void;
    askConfirmation(edited: IRaidProtectionEditable): void;
    clearConfirmation(): void;
    reset(): void;
}

const EMPTY = {
    manageableRoomId: 0,
    settings: null,
    saving: false,
    pendingConfirmation: null
};

export const useRaidProtectionStore = createOctaneStore<RaidProtectionState>()((set, get) => ({
    ...EMPTY,

    setCapability: (roomId, canManage) => {
        if (!canManage) {
            set(EMPTY);

            return;
        }

        // Entering a different room invalidates everything the previous one told us.
        if (get().manageableRoomId !== roomId) set({ ...EMPTY, manageableRoomId: roomId });
        else set({ manageableRoomId: roomId });
    },

    setSettings: (settings) => {
        if (get().manageableRoomId !== settings.roomId) return;

        set({ settings, saving: false, pendingConfirmation: null });
    },

    setSaving: (saving) => set({ saving }),

    askConfirmation: (edited) => set({ pendingConfirmation: edited }),

    clearConfirmation: () => set({ pendingConfirmation: null }),

    reset: () => set(EMPTY)
}));

/** True when the user changed something the server stores, ignoring the two state fields. */
export const raidProtectionHasEdits = (
    stored: IRaidProtectionSettings | null,
    edited: IRaidProtectionEditable | null
): boolean => {
    if (!stored || !edited) return false;

    return (
        stored.enabled !== edited.enabled ||
        stored.detectionSensitivity !== edited.detectionSensitivity ||
        stored.actionType !== edited.actionType ||
        stored.banDurationSeconds !== edited.banDurationSeconds ||
        stored.guardEnabled !== edited.guardEnabled ||
        stored.guardDurationSeconds !== edited.guardDurationSeconds ||
        stored.guardSensitivity !== edited.guardSensitivity
    );
};

/** Turning the protection on is the one change the panel confirms before sending. */
export const raidProtectionNeedsConfirmation = (
    stored: IRaidProtectionSettings | null,
    edited: IRaidProtectionEditable | null
): boolean => !!stored && !!edited && !stored.enabled && edited.enabled;
