/**
 * The picker's recent tab: per room and per variable target, the most recent selection first, at most 20 entries,
 * kept for the session only. Nothing is stored for room 0.
 */
const MAX_HISTORY = 20;

const history = new Map<number, Map<string, string[]>>();

export const addWiredVariablePickerHistory = (roomId: number, target: string, token: string) => {
    if (!roomId || !token) return;

    let roomHistory = history.get(roomId);

    if (!roomHistory) {
        roomHistory = new Map();
        history.set(roomId, roomHistory);
    }

    const tokens = (roomHistory.get(target) ?? []).filter((current) => current !== token);

    tokens.unshift(token);

    if (tokens.length > MAX_HISTORY) tokens.pop();

    roomHistory.set(target, tokens);
};

export const getWiredVariablePickerHistory = (roomId: number, target: string): string[] => {
    if (!roomId) return [];

    return history.get(roomId)?.get(target) ?? [];
};

export const clearWiredVariablePickerHistory = () => history.clear();

/**
 * A selection only enters the history when the wired form is saved. Each mounted picker registers its finalizer here
 * and the editor's save calls finalizeWiredVariablePickers().
 */
const finalizers = new Set<() => void>();

export const registerWiredVariablePickerFinalizer = (finalize: () => void) => {
    finalizers.add(finalize);

    return () => {
        finalizers.delete(finalize);
    };
};

export const finalizeWiredVariablePickers = () => {
    for (const finalize of [...finalizers]) finalize();
};
