/**
 * Places in the client's own windows where an external plugin draws something of its own. The window renders a
 * `PluginSlotView` for the slot; the plugin hands a function that fills the host element it is given and returns
 * the function that empties it. Slots the client offers:
 *
 * - `mod-tools.start-panel`: under the find-user row of the moderator start panel, 155 px wide.
 */
export type PluginSlotMount = (host: HTMLElement) => (() => void) | void;

export interface PluginSlotEntry {
    /** Unique per registration, so a view can key its hosts by it. */
    id: number;
    mount: PluginSlotMount;
}

const slots = new Map<string, PluginSlotEntry[]>();
const listeners = new Set<() => void>();
let nextId = 1;

/** A slot name: lower case letters, digits, dots, dashes and underscores, 1 to 64 characters. */
const SLOT = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export const isValidPluginSlot = (slot: string): boolean => typeof slot === 'string' && SLOT.test(slot);

// One listener that throws must not stop the others from hearing the change.
const notify = () =>
    listeners.forEach((listener) => {
        try {
            listener();
        } catch (error) {
            console.error('[plugin-slots] a listener failed', error);
        }
    });

/** Adds a plugin's content to a slot; returns the function that takes it out again. A bad slot name adds nothing. */
export const registerPluginSlot = (slot: string, mount: PluginSlotMount): (() => void) => {
    if (!isValidPluginSlot(slot) || typeof mount !== 'function') return () => undefined;

    const entry: PluginSlotEntry = { id: nextId++, mount };

    slots.set(slot, [...(slots.get(slot) ?? []), entry]);
    notify();

    return () => {
        const entries = slots.get(slot);

        if (!entries?.includes(entry)) return;

        const rest = entries.filter((candidate) => candidate !== entry);

        if (rest.length) slots.set(slot, rest);
        else slots.delete(slot);

        notify();
    };
};

const EMPTY: PluginSlotEntry[] = [];

/** What is registered in a slot now: the same array until the slot changes, so it can back useSyncExternalStore. */
export const getPluginSlotEntries = (slot: string): PluginSlotEntry[] => slots.get(slot) ?? EMPTY;

export const subscribePluginSlots = (listener: () => void): (() => void) => {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
};

/** Forgets every registration: for tests. */
export const resetPluginSlots = (): void => {
    slots.clear();
    notify();
};
