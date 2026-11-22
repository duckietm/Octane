import { createOctaneStore } from './createOctaneStore';

/**
 * A request to open the profile customiser from outside the profile window (the infostand's edit button). The own
 * profile is asked for at the same time; the profile window takes the request when it arrives and opens the customiser.
 */
interface ProfileCustomizeState {
    pending: boolean;
    request: () => void;
    /** Clears the request and says whether there was one. */
    take: () => boolean;
}

export const useProfileCustomizeStore = createOctaneStore<ProfileCustomizeState>()((set, get) => ({
    pending: false,
    request: () => set({ pending: true }),
    take: () => {
        if (!get().pending) return false;

        set({ pending: false });

        return true;
    }
}));
