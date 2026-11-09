import { IWiredVariableFxConfig, IWiredVariableFxStatus, IWiredVariableFxStatusKey, wiredVariableFxStatusKey } from '@octane/renderer';
import { wiredVariableFxUpdateKind } from '../../api/wired/WiredVariableFx';
import { createOctaneStore } from '../../state/createOctaneStore';

/**
 * A drawn value. `createdAt` is when the holder first showed it (AIR stacks by it), `shownAt` when
 * an update the config's update mask picks last arrived: the "when it changes" mode counts from it.
 */
export interface IWiredVariableFxStatusEntry {
    key: string;
    status: IWiredVariableFxStatus;
    createdAt: number;
    shownAt: number | null;
    previousValue: number | null;
}

/** The holder an fx stack belongs to: `u:<room unit id>` or `f:<floor item id>`. */
export const wiredVariableFxHolderKey = (userEntity: boolean, entityId: number) => `${userEntity ? 'u' : 'f'}:${entityId}`;

export type WiredVariableFxState = {
    configs: Record<number, IWiredVariableFxConfig>;
    statuses: Record<string, IWiredVariableFxStatusEntry>;
    /** The holder under the cursor, for the fx that also show on hover. */
    hoveredHolder: string | null;
};

export type WiredVariableFxActions = {
    applyConfigs(configs: IWiredVariableFxConfig[]): void;
    removeConfigs(configIds: number[]): void;
    applyStatuses(initializeAll: boolean, statuses: IWiredVariableFxStatus[], now?: number): void;
    removeStatuses(keys: IWiredVariableFxStatusKey[]): void;
    setHovered(holder: string, hovered: boolean): void;
    clear(): void;
};

/**
 * What the room's variable fx boxes are showing this player: the configs by fx box id and the
 * values by their wire key. The server only ever sends diffs, so the store is the whole picture.
 */
export const useWiredVariableFxStore = createOctaneStore<WiredVariableFxState & WiredVariableFxActions>()((set) => ({
    configs: {},
    statuses: {},
    hoveredHolder: null,

    applyConfigs: (configs) =>
        set((state) => {
            if (!configs?.length) return state;

            const next = { ...state.configs };

            for (const config of configs) next[config.configId] = config;

            return { configs: next };
        }),

    removeConfigs: (configIds) =>
        set((state) => {
            if (!configIds?.length) return state;

            const removed = new Set(configIds);
            const configs = { ...state.configs };
            const statuses = { ...state.statuses };

            for (const configId of removed) delete configs[configId];

            // A status for a config the client no longer knows draws nothing; drop it too.
            for (const key of Object.keys(statuses)) {
                if (removed.has(statuses[key].status.configId)) delete statuses[key];
            }

            return { configs, statuses };
        }),

    applyStatuses: (initializeAll, statuses, now = Date.now()) =>
        set((state) => {
            if (!statuses?.length && !initializeAll) return state;

            const next: Record<string, IWiredVariableFxStatusEntry> = initializeAll ? {} : { ...state.statuses };

            for (const status of statuses ?? []) {
                const key = wiredVariableFxStatusKey(status);
                const previous = initializeAll ? null : state.statuses[key];
                const previousValue = previous ? previous.status.value : null;
                // A config that has not arrived yet counts every update, as nothing is drawn without it.
                const updateMask = state.configs[status.configId]?.updateMask ?? 15;
                // "Initialize" is drawn as it is, not as an update: it opens no window (as in AIR).
                const opens = !status.initialize && (updateMask & wiredVariableFxUpdateKind(previousValue, status.value)) !== 0;

                next[key] = {
                    key,
                    status,
                    createdAt: previous ? previous.createdAt : now,
                    shownAt: opens ? now : previous ? previous.shownAt : null,
                    previousValue
                };
            }

            return { statuses: next };
        }),

    removeStatuses: (keys) =>
        set((state) => {
            if (!keys?.length) return state;

            const statuses = { ...state.statuses };

            for (const key of keys) delete statuses[wiredVariableFxStatusKey(key)];

            return { statuses };
        }),

    setHovered: (holder, hovered) =>
        set((state) => {
            if (hovered) return state.hoveredHolder === holder ? state : { hoveredHolder: holder };

            return state.hoveredHolder === holder ? { hoveredHolder: null } : state;
        }),

    clear: () => set({ configs: {}, statuses: {}, hoveredHolder: null })
}));
