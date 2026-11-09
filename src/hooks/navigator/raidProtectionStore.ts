import { IRaidProtectionSettings } from '../../api/navigator/RaidProtection';
import { createOctaneStore } from '../../state/createOctaneStore';

/**
 * AIR RaidProtectionSettingsController state: which room the viewer may manage (only the room they
 * are in is kept), its last settings, the room whose settings were asked for, the room a save is
 * in flight for and the room the window shows. Callers pass AIR's "is this the room the viewer is
 * in" checks as booleans, so every transition here is pure.
 */
export type RaidProtectionState = {
    manageableRoomId: number;
    settings: IRaidProtectionSettings | null;
    requestedRoomId: number;
    savingRoomId: number;
    visibleRoomId: number;
};

export type RaidProtectionActions = {
    /** RaidProtectionCapability (2671) for a room the viewer is in. */
    receiveCapability(roomId: number, canManage: boolean): void;
    /** navigator/raidprotection/&lt;id&gt;: true when the settings are to be requested. */
    request(roomId: number, isCurrentRoom: boolean): boolean;
    /** RaidProtectionSettings (3877). */
    receiveSettings(settings: IRaidProtectionSettings, isCurrentRoom: boolean): void;
    /** RaidProtectionSaveResult (958): true when it answers the save this window sent. */
    receiveSaveResult(resultCode: number, settings: IRaidProtectionSettings, isCurrentRoom: boolean): boolean;
    beginSave(roomId: number): void;
    endSave(): void;
    close(): void;
    /** A room session was created or started: only that room's state is kept, the window hides. */
    sessionChanged(roomId: number): void;
    /** A room session ended. */
    clearRoom(roomId: number): void;
    reset(): void;
};

const INITIAL: RaidProtectionState = {
    manageableRoomId: 0,
    settings: null,
    requestedRoomId: 0,
    savingRoomId: 0,
    visibleRoomId: 0
};

const cleared = (state: RaidProtectionState, roomId: number): Partial<RaidProtectionState> => ({
    manageableRoomId: state.manageableRoomId === roomId ? 0 : state.manageableRoomId,
    settings: state.settings?.roomId === roomId ? null : state.settings,
    requestedRoomId: state.requestedRoomId === roomId ? 0 : state.requestedRoomId,
    savingRoomId: state.savingRoomId === roomId ? 0 : state.savingRoomId,
    visibleRoomId: state.visibleRoomId === roomId ? 0 : state.visibleRoomId
});

const onlyRoom = (state: RaidProtectionState, roomId: number): Partial<RaidProtectionState> => ({
    manageableRoomId: state.manageableRoomId === roomId ? roomId : 0,
    settings: state.settings?.roomId === roomId ? state.settings : null,
    requestedRoomId: state.requestedRoomId === roomId ? roomId : 0,
    savingRoomId: state.savingRoomId === roomId ? roomId : 0,
    visibleRoomId: state.visibleRoomId === roomId ? roomId : 0
});

export const useRaidProtectionStore = createOctaneStore<RaidProtectionState & RaidProtectionActions>()((set, get) => ({
    ...INITIAL,

    receiveCapability: (roomId, canManage) =>
    {
        if(roomId <= 0) return;

        const state = get();
        const next = { ...state, ...onlyRoom(state, roomId) };

        set(canManage ? { ...onlyRoom(state, roomId), manageableRoomId: roomId } : cleared(next, roomId));
    },

    request: (roomId, isCurrentRoom) =>
    {
        const state = get();

        if(!isCurrentRoom || state.manageableRoomId !== roomId || state.requestedRoomId === roomId) return false;

        set({ requestedRoomId: roomId, visibleRoomId: 0 });

        return true;
    },

    receiveSettings: (settings, isCurrentRoom) =>
    {
        const state = get();

        if(!isCurrentRoom || state.manageableRoomId !== settings.roomId) return;

        if(state.requestedRoomId === settings.roomId)
        {
            set({ settings, requestedRoomId: 0, visibleRoomId: settings.roomId });

            return;
        }

        set({ settings });
    },

    receiveSaveResult: (resultCode, settings, isCurrentRoom) =>
    {
        const state = get();

        if(settings.roomId !== state.savingRoomId || !isCurrentRoom || state.manageableRoomId !== settings.roomId) return false;

        // AIR closes the window on a successful save; a refused one stays open with the settings in force.
        const closes = resultCode === 0 && state.visibleRoomId === settings.roomId;

        set({
            settings,
            savingRoomId: 0,
            visibleRoomId: closes ? 0 : state.visibleRoomId,
            requestedRoomId: closes ? 0 : state.requestedRoomId
        });

        return true;
    },

    beginSave: (roomId) => set({ savingRoomId: roomId }),

    endSave: () => set({ savingRoomId: 0 }),

    close: () => set({ requestedRoomId: 0, visibleRoomId: 0 }),

    sessionChanged: (roomId) => set({ ...onlyRoom(get(), roomId), visibleRoomId: 0 }),

    clearRoom: (roomId) => set(cleared(get(), roomId)),

    reset: () => set(INITIAL)
}));
