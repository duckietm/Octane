import { IWiredLeaderboardDescriptor, IWiredLeaderboardRow } from '@octane/renderer';
import { ILeaderboardConfig, LEADERBOARD_CHUNK_SIZE, LEADERBOARD_MAX_CHOICES } from '../../api/wired/WiredLeaderboard';
import { createOctaneStore } from '../../state/createOctaneStore';

/** What this player looks at on one panel: the variable, the page and the rows received for it. */
export interface IWiredLeaderboardPanelState {
    descriptor: IWiredLeaderboardDescriptor;
    /** Chosen variable; null when the panel offers none. Local to this player, as in AIR. */
    variableId: string | null;
    page: number;
    /** Exact total once a chunk told it, else null. */
    total: number | null;
    /** Rows by chunk index, for the current revision and variable only. */
    chunks: Record<number, IWiredLeaderboardRow[]>;
    movingForward: boolean;
}

export type WiredLeaderboardState = {
    /** Whether a snapshot arrived since entering the room; chunks before it are ignored. */
    ready: boolean;
    panels: Record<number, IWiredLeaderboardPanelState>;
    /** Panel ids in snapshot order. */
    order: number[];
    /** Grows with every snapshot, so subscriptions are sent again after the server reset them. */
    snapshotSeq: number;
    /**
     * The config being edited in an open leaderboard box: its panel (or, unpublished, a preview)
     * shows it live and can be dragged. editOverlayId is 0 for a box not published yet.
     */
    editDraft: ILeaderboardConfig | null;
    editOverlayId: number;
};

export type WiredLeaderboardActions = {
    applySnapshot(descriptors: IWiredLeaderboardDescriptor[]): void;
    applyChunk(overlayId: number, revision: number, variableId: string, chunkIndex: number, totalCount: number, rows: IWiredLeaderboardRow[]): void;
    selectVariable(overlayId: number, variableId: string): void;
    movePage(overlayId: number, delta: number): void;
    /** The subscription now names only these chunks; the server stops updating the others. */
    keepChunks(overlayId: number, chunkIndices: number[]): void;
    beginEdit(overlayId: number, config: ILeaderboardConfig): void;
    updateDraft(changes: Partial<ILeaderboardConfig>): void;
    endEdit(): void;
    clear(): void;
};

/** The official client's check of a descriptor; a panel that fails it is ignored. */
export const isLeaderboardDescriptorValid = (descriptor: IWiredLeaderboardDescriptor): boolean => {
    if (!descriptor || descriptor.overlayId <= 0) return false;
    if (descriptor.columns.length < 1 || descriptor.columns.length > 4 || descriptor.columns[0].type !== 0) return false;
    if (descriptor.choices.length > LEADERBOARD_MAX_CHOICES) return false;
    if (descriptor.pageSizeOption < 0 || descriptor.pageSizeOption > 2) return false;
    if (descriptor.columns.some((column) => column.width < 0 || column.width > 3)) return false;

    const ids = new Set<string>();

    for (const choice of descriptor.choices) {
        if (!choice.variableId || ids.has(choice.variableId)) return false;

        ids.add(choice.variableId);
    }

    return descriptor.choices.length ? ids.has(descriptor.defaultVariableId) : descriptor.defaultVariableId === '0';
};

const resolveSelection = (descriptor: IWiredLeaderboardDescriptor, previous: string | null): string | null => {
    if (!descriptor.choices.length) return null;
    if (previous && descriptor.choices.some((choice) => choice.variableId === previous)) return previous;

    return descriptor.defaultVariableId;
};

const freshScope = (panel: IWiredLeaderboardPanelState): IWiredLeaderboardPanelState => ({ ...panel, page: 0, total: null, chunks: {}, movingForward: false });

/**
 * The room's variable leaderboard panels as this player sees them. The snapshot says which panels
 * exist; each panel keeps the chunks of rows the server sent for the variable and revision it shows.
 */
export const useWiredLeaderboardStore = createOctaneStore<WiredLeaderboardState & WiredLeaderboardActions>()((set) => ({
    ready: false,
    panels: {},
    order: [],
    snapshotSeq: 0,
    editDraft: null,
    editOverlayId: 0,

    applySnapshot: (descriptors) =>
        set((state) => {
            const panels: Record<number, IWiredLeaderboardPanelState> = {};
            const order: number[] = [];

            for (const descriptor of descriptors ?? []) {
                if (order.length >= 4 || !isLeaderboardDescriptorValid(descriptor) || panels[descriptor.overlayId]) continue;

                const previous = state.panels[descriptor.overlayId];

                // A descriptor older than the one held is ignored, as the official client does.
                if (previous && descriptor.revision < previous.descriptor.revision) {
                    panels[descriptor.overlayId] = previous;
                    order.push(descriptor.overlayId);
                    continue;
                }

                const variableId = resolveSelection(descriptor, previous?.variableId ?? null);
                const panel: IWiredLeaderboardPanelState = previous
                    ? { ...previous, descriptor, variableId }
                    : { descriptor, variableId, page: 0, total: null, chunks: {}, movingForward: false };
                const changed = !previous || previous.descriptor.revision !== descriptor.revision || previous.variableId !== variableId;

                panels[descriptor.overlayId] = changed ? freshScope(panel) : panel;
                order.push(descriptor.overlayId);
            }

            return { ready: true, panels, order, snapshotSeq: state.snapshotSeq + 1 };
        }),

    applyChunk: (overlayId, revision, variableId, chunkIndex, totalCount, rows) =>
        set((state) => {
            const panel = state.panels[overlayId];

            if (!state.ready || !panel || panel.descriptor.revision !== revision || panel.variableId !== variableId) return state;
            if (totalCount < 0 || chunkIndex < 0 || rows.length > LEADERBOARD_CHUNK_SIZE) return state;

            const entriesPerPage = [10, 15, 20][panel.descriptor.pageSizeOption] ?? 10;
            const lastPage = Math.max(0, Math.ceil(totalCount / entriesPerPage) - 1);

            return {
                panels: {
                    ...state.panels,
                    [overlayId]: { ...panel, total: totalCount, page: Math.min(panel.page, lastPage), chunks: { ...panel.chunks, [chunkIndex]: rows } }
                }
            };
        }),

    selectVariable: (overlayId, variableId) =>
        set((state) => {
            const panel = state.panels[overlayId];

            if (!panel || panel.variableId === variableId || !panel.descriptor.choices.some((choice) => choice.variableId === variableId)) return state;

            return { panels: { ...state.panels, [overlayId]: freshScope({ ...panel, variableId }) } };
        }),

    movePage: (overlayId, delta) =>
        set((state) => {
            const panel = state.panels[overlayId];

            if (!panel || panel.total === null) return state;

            const entriesPerPage = [10, 15, 20][panel.descriptor.pageSizeOption] ?? 10;
            const lastPage = Math.max(0, Math.ceil(panel.total / entriesPerPage) - 1);
            const page = Math.max(0, Math.min(lastPage, panel.page + delta));

            if (page === panel.page) return state;

            return { panels: { ...state.panels, [overlayId]: { ...panel, page, movingForward: delta > 0 } } };
        }),

    keepChunks: (overlayId, chunkIndices) =>
        set((state) => {
            const panel = state.panels[overlayId];

            if (!panel) return state;

            const kept: Record<number, IWiredLeaderboardRow[]> = {};
            let dropped = false;

            for (const key of Object.keys(panel.chunks)) {
                const index = Number(key);

                if (chunkIndices.includes(index)) kept[index] = panel.chunks[index];
                else dropped = true;
            }

            return dropped ? { panels: { ...state.panels, [overlayId]: { ...panel, chunks: kept } } } : state;
        }),

    beginEdit: (overlayId, config) => set({ editOverlayId: overlayId, editDraft: config }),

    updateDraft: (changes) => set((state) => (state.editDraft ? { editDraft: { ...state.editDraft, ...changes } } : state)),

    endEdit: () => set({ editOverlayId: 0, editDraft: null }),

    clear: () => set({ ready: false, panels: {}, order: [], editDraft: null, editOverlayId: 0 })
}));
