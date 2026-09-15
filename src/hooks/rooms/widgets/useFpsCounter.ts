import { createOctaneStore } from '../../../state/createOctaneStore';

/**
 * The renderer's FPS counter of the official client (`RoomEngine.setFpsCounterEnabled`, switched
 * on by `:showstats` in `ChatInputWidgetHandler.as:290`). The official only ever enables it.
 */
interface FpsCounterStore {
    isEnabled: boolean;
    setEnabled: (enabled: boolean) => void;
}

export const useFpsCounterStore = createOctaneStore<FpsCounterStore>()((set) => ({
    isEnabled: false,
    setEnabled: (enabled) => set({ isEnabled: enabled })
}));

export const setFpsCounterEnabled = (enabled: boolean) => useFpsCounterStore.getState().setEnabled(enabled);

export const useFpsCounter = () => useFpsCounterStore((state) => state.isEnabled);
