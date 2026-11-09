import type { IRoomObjectVariableFxEntry, IWiredVariableFxConfig } from '@octane/renderer';
import { wiredVariableFxStackOrder, wiredVariableFxVisibleUntil } from '../../api/wired/WiredVariableFx';
import { WiredVariableFxVisualizer } from '../../api/wired/WiredVariableFxVisualizer';
import { IWiredVariableFxStatusEntry, wiredVariableFxHolderKey } from './wiredVariableFxStore';

export interface IWiredVariableFxDrawn {
    entry: IWiredVariableFxStatusEntry;
    config: IWiredVariableFxConfig;
}

/** Every fx drawn over one avatar or furni, in stack order: the first sits lowest, nearest the holder. */
export interface IWiredVariableFxEntityGroup {
    entityKey: string;
    userEntity: boolean;
    entityId: number;
    drawn: IWiredVariableFxDrawn[];
}

/**
 * AIR's stack order (StackedAdditionStack): a higher stack order sits lower, then the older fx
 * (first shown on the holder), then the config id and the variable.
 */
export const compareWiredVariableFxStack = (left: IWiredVariableFxDrawn, right: IWiredVariableFxDrawn): number =>
    wiredVariableFxStackOrder(right.config) - wiredVariableFxStackOrder(left.config) ||
    left.entry.createdAt - right.entry.createdAt ||
    left.config.configId - right.config.configId ||
    left.entry.status.variableId.localeCompare(right.entry.status.variableId);

/**
 * Pairs each status with its config and piles them up per avatar or furni, every category alike
 * (AIR draws boss bars in the holder's stack too). A status whose config has not arrived yet is
 * skipped rather than drawn wrong.
 */
export const groupWiredVariableFxStatuses = (
    configs: Record<number, IWiredVariableFxConfig>,
    statuses: Record<string, IWiredVariableFxStatusEntry>
): IWiredVariableFxEntityGroup[] => {
    const entities = new Map<string, IWiredVariableFxEntityGroup>();

    for (const entry of Object.values(statuses)) {
        const config = configs[entry.status.configId];

        if (!config) continue;

        const entityKey = wiredVariableFxHolderKey(entry.status.userEntity, entry.status.entityId);
        let group = entities.get(entityKey);

        if (!group) {
            group = { entityKey, userEntity: entry.status.userEntity, entityId: entry.status.entityId, drawn: [] };
            entities.set(entityKey, group);
        }

        group.drawn.push({ entry, config });
    }

    for (const group of entities.values()) group.drawn.sort(compareWiredVariableFxStack);

    return [...entities.values()].sort((left, right) => left.entityKey.localeCompare(right.entityKey));
};

/** The room engine call the drawing goes through (IRoomEngine.setRoomObjectVariableFx). */
export interface IWiredVariableFxRoomTarget {
    setRoomObjectVariableFx(roomId: number, objectId: number, category: number, entries: IRoomObjectVariableFxEntry[]): boolean;
}

/** The room object categories a holder maps to. */
export interface IWiredVariableFxCategories {
    unit: number;
    floor: number;
}

interface IVisualizerSlot {
    visualizer: WiredVariableFxVisualizer;
    entry: IWiredVariableFxStatusEntry;
    config: IWiredVariableFxConfig;
}

interface IHolderSlot {
    userEntity: boolean;
    entityId: number;
    entries: IRoomObjectVariableFxEntry[];
}

const sameEntries = (left: IRoomObjectVariableFxEntry[], right: IRoomObjectVariableFxEntry[]) =>
    left.length === right.length &&
    left.every((entry, index) => {
        const other = right[index];

        return (
            entry.key === other.key &&
            entry.layer === other.layer &&
            entry.createdAt === other.createdAt &&
            entry.configId === other.configId &&
            entry.variableId === other.variableId &&
            entry.visible === other.visible &&
            entry.visualizer === other.visualizer
        );
    });

/**
 * Hands the store's fx to the room renderer, which draws them in each holder's visualization: one
 * visualizer per value (kept while the value lives, so AIR's painter can animate it), visibility decided here
 * as before (show mode, hover, update mask), and a holder that lost every fx sent an empty list so
 * the renderer fades them out. Objects that arrive later get their fx through `reapply`.
 */
export class WiredVariableFxRoomDrawing {
    private _visualizers = new Map<string, IVisualizerSlot>();
    private _holders = new Map<string, IHolderSlot>();

    constructor(
        private readonly _target: IWiredVariableFxRoomTarget,
        private readonly _categories: IWiredVariableFxCategories,
        private readonly _createVisualizer: () => WiredVariableFxVisualizer = () => new WiredVariableFxVisualizer()
    ) {}

    /**
     * Sends every holder's stack that changed. Returns when the next "when it changes" fx hides on
     * its own (the caller syncs again then), or null when none will.
     */
    public sync(
        roomId: number,
        configs: Record<number, IWiredVariableFxConfig>,
        statuses: Record<string, IWiredVariableFxStatusEntry>,
        hoveredHolder: string | null,
        now: number
    ): number | null {
        const groups = groupWiredVariableFxStatuses(configs, statuses);
        const liveKeys = new Set<string>();
        const liveHolders = new Set<string>();
        let wakeAt: number | null = null;

        for (const group of groups) {
            const hovered = hoveredHolder === group.entityKey;
            const entries: IRoomObjectVariableFxEntry[] = [];

            for (const drawn of group.drawn) {
                const visibility = wiredVariableFxVisibleUntil(drawn.config, drawn.entry.shownAt, hovered, now);
                const visualizer = this.resolveVisualizer(drawn, !visibility.visible, now);

                if (visibility.visible && visibility.until !== null && visibility.until > now) wakeAt = wakeAt === null ? visibility.until : Math.min(wakeAt, visibility.until);

                liveKeys.add(drawn.entry.key);
                entries.push({
                    key: drawn.entry.key,
                    layer: -wiredVariableFxStackOrder(drawn.config) || 0,
                    createdAt: drawn.entry.createdAt,
                    configId: drawn.config.configId,
                    variableId: drawn.entry.status.variableId,
                    visible: visibility.visible,
                    visualizer
                });
            }

            liveHolders.add(group.entityKey);
            this.send(roomId, group.entityKey, group.userEntity, group.entityId, entries);
        }

        for (const [holderKey, holder] of [...this._holders]) {
            if (liveHolders.has(holderKey)) continue;

            this._target.setRoomObjectVariableFx(roomId, holder.entityId, this.categoryOf(holder.userEntity), []);
            this._holders.delete(holderKey);
        }

        for (const key of [...this._visualizers.keys()]) {
            if (!liveKeys.has(key)) this._visualizers.delete(key);
        }

        return wakeAt;
    }

    /** An avatar or furni (re)entered the room: give it the fx it holds. */
    public reapply(roomId: number, userEntity: boolean, entityId: number): void {
        const holder = this._holders.get(wiredVariableFxHolderKey(userEntity, entityId));

        if (holder) this._target.setRoomObjectVariableFx(roomId, entityId, this.categoryOf(userEntity), holder.entries);
    }

    /** Takes every fx off the room (leaving it or unmounting). */
    public clear(roomId: number): void {
        for (const holder of this._holders.values()) this._target.setRoomObjectVariableFx(roomId, holder.entityId, this.categoryOf(holder.userEntity), []);

        this._holders.clear();
        this._visualizers.clear();
    }

    public getVisualizer(key: string): WiredVariableFxVisualizer | null {
        return this._visualizers.get(key)?.visualizer ?? null;
    }

    private resolveVisualizer(drawn: IWiredVariableFxDrawn, invisible: boolean, now: number): WiredVariableFxVisualizer {
        let slot = this._visualizers.get(drawn.entry.key);

        if (!slot) {
            slot = { visualizer: this._createVisualizer(), entry: null, config: null };
            this._visualizers.set(drawn.entry.key, slot);
        }

        if (slot.entry !== drawn.entry || slot.config !== drawn.config) {
            // AIR draws a value that arrives while its fx is hidden at once, without animating to it.
            slot.visualizer.setData(drawn.config, drawn.entry.status, invisible, now);
            slot.entry = drawn.entry;
            slot.config = drawn.config;
        }

        return slot.visualizer;
    }

    private send(roomId: number, holderKey: string, userEntity: boolean, entityId: number, entries: IRoomObjectVariableFxEntry[]): void {
        const previous = this._holders.get(holderKey);

        if (previous && sameEntries(previous.entries, entries)) return;

        this._holders.set(holderKey, { userEntity, entityId, entries });
        this._target.setRoomObjectVariableFx(roomId, entityId, this.categoryOf(userEntity), entries);
    }

    private categoryOf(userEntity: boolean): number {
        return userEntity ? this._categories.unit : this._categories.floor;
    }
}
