import { DESKTOP_LAYOUT, HandheldLayout, sameHandheldLayout } from '../api/handheld/handheldLayout';
import { createOctaneStore } from './createOctaneStore';

/**
 * The phone layout, shared by every feature that adapts to it (windows, room input, toolbar, chat,
 * infostand). Written only by `startHandheldWatcher`; it starts as the desktop layout, so nothing
 * changes until the watcher decided the device is a phone.
 */
interface HandheldState {
    layout: HandheldLayout;
    /** CSS px of the layout viewport the on-screen keyboard covers; 0 when closed. */
    keyboardInset: number;
    setLayout: (layout: HandheldLayout) => void;
    setKeyboardInset: (inset: number) => void;
}

export const useHandheldStore = createOctaneStore<HandheldState>()((set, get) => ({
    layout: DESKTOP_LAYOUT,
    keyboardInset: 0,
    setLayout: (layout) => {
        if (sameHandheldLayout(get().layout, layout)) return;

        set({ layout });
    },
    setKeyboardInset: (keyboardInset) => {
        if (get().keyboardInset === keyboardInset) return;

        set({ keyboardInset });
    }
}));

/** For code outside React (room input, window placement): is the phone layout on right now? */
export const isHandheldActive = (): boolean => useHandheldStore.getState().layout.active;
