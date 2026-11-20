import { createOctaneStore } from '@/state/createOctaneStore';

interface WiredClickSettingsState {
    /** The room's click settings as the server last announced them (0 / 0 is the default). */
    userOption: number;
    furniOption: number;
    /** A wired editor chose to click as if the room had no click settings. */
    ignored: boolean;
    /** Whether this player may edit the room's wired: only they are offered the switch. */
    canWrite: boolean;
    setOptions(userOption: number, furniOption: number): void;
    setIgnored(ignored: boolean): void;
    setCanWrite(canWrite: boolean): void;
    /** A new room starts with the default click settings and nothing ignored. */
    resetRoom(): void;
}

export const useWiredClickSettingsStore = createOctaneStore<WiredClickSettingsState>()((set) => ({
    userOption: 0,
    furniOption: 0,
    ignored: false,
    canWrite: false,
    setOptions: (userOption, furniOption) => set({ userOption, furniOption }),
    setIgnored: (ignored) => set({ ignored }),
    setCanWrite: (canWrite) => set({ canWrite }),
    resetRoom: () => set({ userOption: 0, furniOption: 0, ignored: false })
}));

export const hasActiveWiredClickSettings = (state: { userOption: number; furniOption: number }): boolean => state.userOption !== 0 || state.furniOption !== 0;

export type WiredClickSettingsNotice = 'none' | 'changed' | 'changed_ignored';

export interface WiredClickSettingsUpdate {
    ignored: boolean;
    /** Whether the room engine takes the new settings; false while they are ignored. */
    apply: boolean;
    notice: WiredClickSettingsNotice;
}

/**
 * Official WiredEnvironment.onWiredClickSettingsEvent: what a click-settings packet does, given what was known.
 * - An unchanged packet does nothing.
 * - An editor who lost the right to edit wired stops ignoring.
 * - While ignored, the change is only announced (with the "ignored" text when settings are active).
 * - An editor with active settings gets the staying switch instead of a bubble.
 */
export const resolveWiredClickSettingsUpdate = (
    previous: { userOption: number; furniOption: number; ignored: boolean; canWrite: boolean },
    next: { userOption: number; furniOption: number }
): WiredClickSettingsUpdate => {
    let changed = previous.userOption !== next.userOption || previous.furniOption !== next.furniOption;
    let ignored = previous.ignored;

    if (ignored && !previous.canWrite) {
        ignored = false;
        changed = true;
    }

    if (!changed) return { ignored, apply: false, notice: 'none' };

    const active = hasActiveWiredClickSettings(next);

    if (ignored) {
        // Nothing left to ignore once the room is back on the default settings.
        if (!active) return { ignored: false, apply: true, notice: 'changed' };

        return { ignored: true, apply: false, notice: 'changed_ignored' };
    }

    return { ignored: false, apply: true, notice: previous.canWrite && active ? 'none' : 'changed' };
};
