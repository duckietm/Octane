import { GroupItem } from '../api';
import { createOctaneStore } from './createOctaneStore';

/**
 * The Furni-Matic page while it is open (AIR RecyclerModel.running). The inventory reads it: it marks the stacks that
 * can be recycled, and a double click on a stack sends one of its furni to the recycler instead of placing it.
 */
interface RecyclerSessionState {
    /** Puts one furni of the stack in the next free slot; null while the page is closed. */
    place: ((groupItem: GroupItem) => void) | null;
    start: (place: (groupItem: GroupItem) => void) => void;
    /** Ends the session of that page only: a page opened meanwhile keeps its own. */
    stop: (place: (groupItem: GroupItem) => void) => void;
}

export const useRecyclerSessionStore = createOctaneStore<RecyclerSessionState>()((set) => ({
    place: null,
    start: (place) => set({ place }),
    stop: (place) => set((state) => (state.place === place ? { place: null } : state))
}));
