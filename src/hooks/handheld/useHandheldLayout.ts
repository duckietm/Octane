import { HandheldLayout } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

/** The phone layout (active + orientation). Desktop until the watcher decides otherwise. */
export const useHandheldLayout = (): HandheldLayout => useHandheldStore((state) => state.layout);

/** True while the phone layout is on. */
export const useIsHandheld = (): boolean => useHandheldStore((state) => state.layout.active);

/** CSS px the on-screen keyboard covers (0 when it is closed, and always 0 outside the phone layout). */
export const useHandheldKeyboardInset = (): number => useHandheldStore((state) => state.keyboardInset);
