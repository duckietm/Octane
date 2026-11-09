import { createOctaneStore } from './createOctaneStore';

export interface VariablesExplorerPrefill {
    roomId?: number;
    readKey?: string;
    writeKey?: string;
}

interface VariablesExplorerState {
    isOpen: boolean;
    prefill: VariablesExplorerPrefill | null;
    /** Bumped on every open, so an open window takes a new prefill. */
    openCount: number;
    open: (prefill?: VariablesExplorerPrefill) => void;
    close: () => void;
}

/** The Variables Explorer window, opened from the web api box editor and the wired creator tools. */
export const useVariablesExplorerStore = createOctaneStore<VariablesExplorerState>()((set) => ({
    isOpen: false,
    prefill: null,
    openCount: 0,
    open: (prefill) => set((state) => ({ isOpen: true, prefill: prefill ?? null, openCount: state.openCount + 1 })),
    close: () => set({ isOpen: false, prefill: null })
}));
