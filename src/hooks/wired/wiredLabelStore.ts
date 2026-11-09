import { IWiredLabel } from '@octane/renderer';
import { createOctaneStore } from '../../state/createOctaneStore';

export type WiredLabelState = {
    /** The labels this player may see, by furni id. */
    labels: Record<number, IWiredLabel>;
    /** Labels opened by a click. */
    openIds: number[];
    /** The label furni under the mouse, 0 for none. */
    hoveredId: number;
    /** The label whose settings window is open, 0 for none. */
    settingsId: number;
};

export type WiredLabelActions = {
    replace(labels: IWiredLabel[]): void;
    update(changed: IWiredLabel[], removedIds: number[]): void;
    toggle(furnitureId: number): void;
    close(furnitureId: number): void;
    setHovered(furnitureId: number, hovered: boolean): void;
    openSettings(furnitureId: number): void;
    closeSettings(): void;
    clear(): void;
};

/**
 * The room's furniture labels (wf_label) as this player sees them, and which bubbles are open. The
 * server sends the whole list on entry and when wired rights change, then only changes.
 */
export const useWiredLabelStore = createOctaneStore<WiredLabelState & WiredLabelActions>()((set) => ({
    labels: {},
    openIds: [],
    hoveredId: 0,
    settingsId: 0,

    replace: (labels) =>
        set((state) => {
            const next: Record<number, IWiredLabel> = {};

            for (const label of labels ?? []) next[label.furnitureId] = label;

            return {
                labels: next,
                openIds: state.openIds.filter((id) => !!next[id]),
                settingsId: next[state.settingsId] ? state.settingsId : 0
            };
        }),

    update: (changed, removedIds) =>
        set((state) => {
            const next = { ...state.labels };

            for (const label of changed ?? []) next[label.furnitureId] = label;
            for (const id of removedIds ?? []) delete next[id];

            return {
                labels: next,
                openIds: state.openIds.filter((id) => !!next[id]),
                hoveredId: next[state.hoveredId] ? state.hoveredId : 0,
                settingsId: next[state.settingsId] ? state.settingsId : 0
            };
        }),

    toggle: (furnitureId) =>
        set((state) => {
            if (!state.labels[furnitureId]) return state;

            return {
                openIds: state.openIds.includes(furnitureId) ? state.openIds.filter((id) => id !== furnitureId) : [...state.openIds, furnitureId]
            };
        }),

    close: (furnitureId) => set((state) => ({ openIds: state.openIds.filter((id) => id !== furnitureId) })),

    setHovered: (furnitureId, hovered) =>
        set((state) => {
            if (hovered) return state.labels[furnitureId] ? { hoveredId: furnitureId } : state;

            return state.hoveredId === furnitureId ? { hoveredId: 0 } : state;
        }),

    openSettings: (furnitureId) => set((state) => (state.labels[furnitureId] ? { settingsId: furnitureId } : state)),

    closeSettings: () => set({ settingsId: 0 }),

    clear: () => set({ labels: {}, openIds: [], hoveredId: 0, settingsId: 0 })
}));
