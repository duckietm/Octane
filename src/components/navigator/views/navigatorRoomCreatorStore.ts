import { createOctaneStore } from '../../../state/createOctaneStore';

const CREATE_LOCKOUT_MS = 5000;

interface RoomCreatorState {
    isCreating: boolean;
    beginCreate: () => void;
    /** The server refused the create (room limit): unlock right away instead of waiting out the lockout. */
    endCreate: () => void;
}

export const useRoomCreatorStore = createOctaneStore<RoomCreatorState>()((set) => {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    return {
        isCreating: false,
        beginCreate: () => {
            if (timeoutHandle !== null) clearTimeout(timeoutHandle);

            set({ isCreating: true });

            timeoutHandle = setTimeout(() => {
                timeoutHandle = null;
                set({ isCreating: false });
            }, CREATE_LOCKOUT_MS);
        },
        endCreate: () => {
            if (timeoutHandle !== null) clearTimeout(timeoutHandle);

            timeoutHandle = null;
            set({ isCreating: false });
        }
    };
});
