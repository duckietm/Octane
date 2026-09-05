import { createOctaneStore } from '../../../state/createOctaneStore';

const CREATE_LOCKOUT_MS = 5000;

interface RoomCreatorState {
    isCreating: boolean;
    beginCreate: () => void;
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
        }
    };
});
