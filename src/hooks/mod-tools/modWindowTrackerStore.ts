import { createOctaneStore } from '../../state/createOctaneStore';

export type ModWindowType = 'issueHandler' | 'issueBrowser' | 'roomTool' | 'userInfo' | 'sendMessage' | 'modAction' | 'roomVisits' | 'userChatlog' | 'roomChatlog' | 'cfhChatlog' | 'userClassification' | 'userRecords';

export const MOD_WINDOW_SIZE: Record<ModWindowType, { width: number; height: number }> = {
    roomTool: { width: 240, height: 437 },
    userInfo: { width: 292, height: 225 },
    sendMessage: { width: 212, height: 168 },
    modAction: { width: 383, height: 295 },
    roomVisits: { width: 292, height: 224 },
    userRecords: { width: 560, height: 240 },
    userClassification: { width: 292, height: 224 },
    userChatlog: { width: 480, height: 565 },
    roomChatlog: { width: 480, height: 565 },
    cfhChatlog: { width: 480, height: 565 },
    issueBrowser: { width: 585, height: 273 },
    issueHandler: { width: 750, height: 650 }
};

export interface ModWindowRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ModWindow extends ModWindowRect {
    type: ModWindowType;
    key: string;
    /** Bumped when the window is shown again while open: the replacement instance starts over (and asks for its data again). */
    revision: number;
    /** The window was closed with its close button but keeps its frame (the issue browser is only hidden): showing it again puts it back where it was. */
    hidden?: boolean;
    /** What the window needs besides its key (the user a message goes to, ...). */
    params: Record<string, string | number>;
}

export interface ModWindowShowRequest {
    type: ModWindowType;
    key: string;
    width: number;
    height: number;
    /** The frame the new window is placed next to; without one the window is centred on the desktop. */
    parent?: ModWindowRect | null;
    /** Place the window under its parent (parent.y + parent.height + 5) instead of to its right (parent.x + parent.width + 5). */
    below?: boolean;
    /** Show nothing when no window of that type and key is open (used for refreshes). */
    silent?: boolean;
    /** Close the window instead when one of that type and key is open already. */
    toggle?: boolean;
    /** An explicit position (the classic show() with its "explicit position" flag): the window is placed there instead of next to a parent. */
    at?: { x: number; y: number };
    params?: Record<string, string | number>;
}

interface ModWindowTrackerState {
    /** The start panel frame (the parent of the first tool windows); follows the panel when it is dragged. */
    startPanel: ModWindowRect;
    setStartPanel: (rect: ModWindowRect) => void;
    windows: ModWindow[];
    show: (request: ModWindowShowRequest) => void;
    close: (type: ModWindowType, key: string) => void;
    hide: (type: ModWindowType, key: string) => void;
    move: (type: ModWindowType, key: string, x: number, y: number) => void;
    resize: (type: ModWindowType, key: string, width: number, height: number) => void;
    get: (type: ModWindowType, key: string) => ModWindow | null;
}

const clampToDesktop = (rect: ModWindowRect): ModWindowRect => ({
    ...rect,
    x: Math.max(0, Math.min(rect.x, window.innerWidth - rect.width)),
    y: Math.max(0, Math.min(rect.y, window.innerHeight - rect.height))
});

// Classic v75 WindowTracker (qn): one window per type and key. Showing an open window again closes it when `toggle` is set and otherwise replaces it in place;
// a new window goes right of (or below) its parent frame, centred on the desktop without a parent, and is kept inside the desktop.
export const useModWindowTrackerStore = createOctaneStore<ModWindowTrackerState>()((set, get) => ({
    startPanel: { x: 120, y: 64, width: 170, height: 170 },
    setStartPanel: (rect) => set({ startPanel: rect }),
    windows: [],
    get: (type, key) => get().windows.find((entry) => entry.type === type && entry.key === key) ?? null,
    show: ({ type, key, width, height, parent = null, below = false, silent = false, toggle = false, at = null, params = {} }) => {
        const existing = get().windows.find((entry) => entry.type === type && entry.key === key);

        if (existing) {
            set((state) => ({
                windows: toggle ? state.windows.filter((entry) => entry !== existing) : state.windows.map((entry) => (entry === existing ? { ...entry, hidden: false, revision: entry.revision + 1 } : entry))
            }));

            return;
        }

        if (silent) return;

        const placed = at
            ? at
            : parent
            ? below
                ? { x: parent.x, y: parent.y + parent.height + 5 }
                : { x: parent.x + parent.width + 5, y: parent.y }
            : { x: Math.floor(window.innerWidth / 2 - width / 2), y: Math.floor(window.innerHeight / 2 - height / 2) };

        set((state) => ({ windows: [...state.windows, { type, key, width, height, revision: 0, params, ...clampToDesktop({ ...placed, width, height }) }] }));
    },
    hide: (type, key) => set((state) => ({ windows: state.windows.map((entry) => (entry.type === type && entry.key === key ? { ...entry, hidden: true } : entry)) })),
    close: (type, key) => set((state) => ({ windows: state.windows.filter((entry) => entry.type !== type || entry.key !== key) })),
    move: (type, key, x, y) => set((state) => ({ windows: state.windows.map((entry) => (entry.type === type && entry.key === key ? { ...entry, x, y } : entry)) })),
    resize: (type, key, width, height) => set((state) => ({ windows: state.windows.map((entry) => (entry.type === type && entry.key === key ? { ...entry, width, height } : entry)) }))
}));
