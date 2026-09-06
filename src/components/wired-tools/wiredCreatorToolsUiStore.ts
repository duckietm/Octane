import { createOctaneStore } from '../../state/createOctaneStore';
import { createEmptyMonitorSnapshot } from './WiredCreatorTools.helpers';
import {
    InspectionElementType,
    InspectionFurniLiveState,
    InspectionFurniSelection,
    InspectionUserLiveState,
    InspectionUserSelection,
    MonitorSnapshot,
    VariableHighlightOverlay,
    VariableManageEntry,
    VariablesElementType,
    WiredToolsTab
} from './WiredCreatorTools.types';

type MonitorSeverityFilter = 'ALL' | 'ERROR' | 'WARNING';
type Updater<T> = T | ((prev: T) => T);

const apply = <T>(prev: T, next: Updater<T>): T => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next);

interface WiredCreatorToolsUiState {
    isVisible: boolean;
    activeTab: WiredToolsTab;
    inspectionType: InspectionElementType;
    variablesType: VariablesElementType;

    isMonitorHistoryOpen: boolean;
    isMonitorInfoOpen: boolean;
    isInspectionGiveOpen: boolean;
    isVariableManageOpen: boolean;
    isManagedGiveOpen: boolean;

    monitorHistorySeverityFilter: MonitorSeverityFilter;
    monitorHistoryTypeFilter: string;

    variableManageTypeFilter: string;
    variableManageSort: string;
    variableManagePage: number;

    /**
     * Latest snapshot pushed by the server through `WiredMonitorDataEvent`.
     * Held in the store (rather than `useState`) so it survives remount
     * — e.g. closing and reopening the panel between two server pushes
     * keeps the last-known stats visible instead of flashing back to the
     * empty snapshot.
     */
    monitorSnapshot: MonitorSnapshot;

    /**
     * Inspection selection. The room-event listeners
     * (`useObjectSelectedEvent` and the per-kind `useMessageEvent`
     * handlers) still live in `WiredCreatorToolsView` — they need React
     * lifecycle to subscribe/unsubscribe correctly — but the resulting
     * state lives here so a closed/reopened panel keeps the last
     * inspected target.
     *
     * `*ActionVersion` is a monotonic counter the user-action handlers
     * bump to force the live-state recomputation effect to re-run even
     * when neither `selectedUser` nor `roomIndex` changed identity.
     */
    selectedFurni: InspectionFurniSelection | null;
    selectedFurniLiveState: InspectionFurniLiveState | null;
    selectedUser: InspectionUserSelection | null;
    selectedUserLiveState: InspectionUserLiveState | null;
    selectedUserActionVersion: number;

    /**
     * Variable highlight feature: the toggle UI flag (`isActive`) plus
     * the computed screen-space overlays the parent's effect populates
     * from `WiredSelectionVisualizer` + `GetRoomObjectScreenLocation`.
     * Stored together so a panel close/reopen cycle keeps the active
     * highlight visible instead of re-toggling from scratch.
     */
    isVariableHighlightActive: boolean;
    variableHighlightOverlays: VariableHighlightOverlay[];

    /**
     * Inline-editor state for the Inspection-tab variables table.
     * `editingVariable` is the key of the variable whose value is being
     * edited (null = none); `editingValue` is the in-flight text input.
     * The "managed holder" pair plays the same role for the Variable
     * Manage panel's holder rows (id 0 = none).
     *
     * The component uses these together with `shouldPauseVariableSnapshotRefresh`
     * to suppress the periodic variables poll while an edit is open
     * (so typing isn't clobbered by an incoming snapshot).
     */
    editingVariable: string | null;
    editingValue: string;
    editingManagedHolderVariableId: number;
    editingManagedHolderValue: string;

    /**
     * Currently selected variable key per tab/type, used as the "active"
     * row in the Inspection and Variables tabs. The sync effects in
     * `WiredCreatorToolsView` auto-pick the first available key whenever
     * the definitions list for that type changes, so we initialize empty
     * — the component's first paint populates them.
     */
    selectedInspectionVariableKeys: Record<InspectionElementType, string>;
    selectedVariableKeys: Record<VariablesElementType, string>;

    /**
     * Inspection-tab "Give variable" popover state. `itemId` is the
     * picked variable definition id (0 = none); `value` is the in-flight
     * value text. Both reset to their defaults whenever the inspection
     * target changes (sync effect in WiredCreatorToolsView).
     */
    inspectionGiveVariableItemId: number;
    inspectionGiveValue: string;

    /**
     * Variable-Manage panel — "managed holder" picker chain. Selecting
     * an entry seeds the holder row, which seeds the give-variable
     * picker. Sentinels: `null` entry / `0` holder-id / `0` give-id /
     * `'0'` give-value. The cascade reset effects at
     * WiredCreatorToolsView.tsx:2265-2307 keep these in sync as the
     * upstream selection or available definitions change.
     */
    selectedManagedVariableEntry: VariableManageEntry | null;
    selectedManagedHolderVariableId: number;
    managedGiveVariableItemId: number;
    managedGiveValue: string;

    setIsVisible: (next: Updater<boolean>) => void;
    setActiveTab: (next: WiredToolsTab) => void;
    setInspectionType: (next: InspectionElementType) => void;
    setVariablesType: (next: VariablesElementType) => void;

    setIsMonitorHistoryOpen: (next: boolean) => void;
    setIsMonitorInfoOpen: (next: boolean) => void;
    setIsInspectionGiveOpen: (next: Updater<boolean>) => void;
    setIsVariableManageOpen: (next: boolean) => void;
    setIsManagedGiveOpen: (next: Updater<boolean>) => void;

    setMonitorHistorySeverityFilter: (next: MonitorSeverityFilter) => void;
    setMonitorHistoryTypeFilter: (next: string) => void;

    setVariableManageTypeFilter: (next: string) => void;
    setVariableManageSort: (next: string) => void;
    setVariableManagePage: (next: Updater<number>) => void;

    setMonitorSnapshot: (next: MonitorSnapshot) => void;
    resetMonitorSnapshot: () => void;

    setSelectedFurni: (next: InspectionFurniSelection | null) => void;
    setSelectedFurniLiveState: (next: Updater<InspectionFurniLiveState | null>) => void;
    setSelectedUser: (next: InspectionUserSelection | null) => void;
    setSelectedUserLiveState: (next: Updater<InspectionUserLiveState | null>) => void;
    setSelectedUserActionVersion: (next: Updater<number>) => void;

    setIsVariableHighlightActive: (next: Updater<boolean>) => void;
    setVariableHighlightOverlays: (next: VariableHighlightOverlay[]) => void;

    setEditingVariable: (next: string | null) => void;
    setEditingValue: (next: string) => void;
    setEditingManagedHolderVariableId: (next: number) => void;
    setEditingManagedHolderValue: (next: string) => void;

    setSelectedInspectionVariableKeys: (next: Updater<Record<InspectionElementType, string>>) => void;
    setSelectedVariableKeys: (next: Updater<Record<VariablesElementType, string>>) => void;

    setInspectionGiveVariableItemId: (next: number) => void;
    setInspectionGiveValue: (next: string) => void;

    setSelectedManagedVariableEntry: (next: VariableManageEntry | null) => void;
    setSelectedManagedHolderVariableId: (next: number) => void;
    setManagedGiveVariableItemId: (next: number) => void;
    setManagedGiveValue: (next: string) => void;
}

export const useWiredCreatorToolsUiStore = createOctaneStore<WiredCreatorToolsUiState>()((set) => ({
    isVisible: false,
    activeTab: 'monitor',
    inspectionType: 'furni',
    variablesType: 'furni',

    isMonitorHistoryOpen: false,
    isMonitorInfoOpen: false,
    isInspectionGiveOpen: false,
    isVariableManageOpen: false,
    isManagedGiveOpen: false,

    monitorHistorySeverityFilter: 'ALL',
    monitorHistoryTypeFilter: 'ALL',

    variableManageTypeFilter: 'ALL',
    variableManageSort: 'highest_value',
    variableManagePage: 1,

    monitorSnapshot: createEmptyMonitorSnapshot(),

    selectedFurni: null,
    selectedFurniLiveState: null,
    selectedUser: null,
    selectedUserLiveState: null,
    selectedUserActionVersion: 0,

    isVariableHighlightActive: false,
    variableHighlightOverlays: [],

    editingVariable: null,
    editingValue: '',
    editingManagedHolderVariableId: 0,
    editingManagedHolderValue: '',

    selectedInspectionVariableKeys: { furni: '', user: '', global: '' },
    selectedVariableKeys: { furni: '', user: '', global: '', context: '' },

    inspectionGiveVariableItemId: 0,
    inspectionGiveValue: '0',

    selectedManagedVariableEntry: null,
    selectedManagedHolderVariableId: 0,
    managedGiveVariableItemId: 0,
    managedGiveValue: '0',

    setIsVisible: (next) => set((state) => ({ isVisible: apply(state.isVisible, next) })),
    setActiveTab: (next) => set({ activeTab: next }),
    setInspectionType: (next) => set({ inspectionType: next }),
    setVariablesType: (next) => set({ variablesType: next }),

    setIsMonitorHistoryOpen: (next) => set({ isMonitorHistoryOpen: next }),
    setIsMonitorInfoOpen: (next) => set({ isMonitorInfoOpen: next }),
    setIsInspectionGiveOpen: (next) => set((state) => ({ isInspectionGiveOpen: apply(state.isInspectionGiveOpen, next) })),
    setIsVariableManageOpen: (next) => set({ isVariableManageOpen: next }),
    setIsManagedGiveOpen: (next) => set((state) => ({ isManagedGiveOpen: apply(state.isManagedGiveOpen, next) })),

    setMonitorHistorySeverityFilter: (next) => set({ monitorHistorySeverityFilter: next }),
    setMonitorHistoryTypeFilter: (next) => set({ monitorHistoryTypeFilter: next }),

    setVariableManageTypeFilter: (next) => set({ variableManageTypeFilter: next }),
    setVariableManageSort: (next) => set({ variableManageSort: next }),
    setVariableManagePage: (next) => set((state) => ({ variableManagePage: apply(state.variableManagePage, next) })),

    setMonitorSnapshot: (next) => set({ monitorSnapshot: next }),
    resetMonitorSnapshot: () => set({ monitorSnapshot: createEmptyMonitorSnapshot() }),

    setSelectedFurni: (next) => set({ selectedFurni: next }),
    setSelectedFurniLiveState: (next) => set((state) => ({ selectedFurniLiveState: apply(state.selectedFurniLiveState, next) })),
    setSelectedUser: (next) => set({ selectedUser: next }),
    setSelectedUserLiveState: (next) => set((state) => ({ selectedUserLiveState: apply(state.selectedUserLiveState, next) })),
    setSelectedUserActionVersion: (next) => set((state) => ({ selectedUserActionVersion: apply(state.selectedUserActionVersion, next) })),

    setIsVariableHighlightActive: (next) => set((state) => ({ isVariableHighlightActive: apply(state.isVariableHighlightActive, next) })),
    setVariableHighlightOverlays: (next) => set({ variableHighlightOverlays: next }),

    setEditingVariable: (next) => set({ editingVariable: next }),
    setEditingValue: (next) => set({ editingValue: next }),
    setEditingManagedHolderVariableId: (next) => set({ editingManagedHolderVariableId: next }),
    setEditingManagedHolderValue: (next) => set({ editingManagedHolderValue: next }),

    setSelectedInspectionVariableKeys: (next) => set((state) => ({ selectedInspectionVariableKeys: apply(state.selectedInspectionVariableKeys, next) })),
    setSelectedVariableKeys: (next) => set((state) => ({ selectedVariableKeys: apply(state.selectedVariableKeys, next) })),

    setInspectionGiveVariableItemId: (next) => set({ inspectionGiveVariableItemId: next }),
    setInspectionGiveValue: (next) => set({ inspectionGiveValue: next }),

    setSelectedManagedVariableEntry: (next) => set({ selectedManagedVariableEntry: next }),
    setSelectedManagedHolderVariableId: (next) => set({ selectedManagedHolderVariableId: next }),
    setManagedGiveVariableItemId: (next) => set({ managedGiveVariableItemId: next }),
    setManagedGiveValue: (next) => set({ managedGiveValue: next })
}));
