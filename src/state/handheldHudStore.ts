import { createOctaneStore } from './createOctaneStore';

/**
 * What the phone HUD has unfolded. Shared because the pieces live in different features: the chat button sits with
 * the room chip while the chat line belongs to the toolbar, and the purse's arrow also unfolds the widgets of the
 * right column. Both start folded, so an idle phone shows the room, the toolbar and the two chips only.
 */
interface HandheldHudState {
    /** The room chat line is shown (above the toolbar, or on top of the on-screen keyboard). */
    chatOpen: boolean;
    /** The purse's actions and the right column's widgets are shown. */
    sideOpen: boolean;
    setChatOpen: (open: boolean) => void;
    setSideOpen: (open: boolean) => void;
}

export const useHandheldHudStore = createOctaneStore<HandheldHudState>()((set, get) => ({
    chatOpen: false,
    sideOpen: false,
    setChatOpen: (chatOpen) => {
        if (get().chatOpen !== chatOpen) set({ chatOpen });
    },
    setSideOpen: (sideOpen) => {
        if (get().sideOpen !== sideOpen) set({ sideOpen });
    }
}));
