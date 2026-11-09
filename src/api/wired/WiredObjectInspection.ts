/** AIR `WiredMenuInspectionTab.POLL_VARIABLES_MS`: the open tab re-reads the inspected object this often. */
export const WIRED_OBJECT_INSPECTION_POLL_MS = 500;

/** The object types of AIR's inspection read (`WiredInputSourcePicker` furni / user, `VariableExtraSourceTypes` global). */
export const WIRED_INSPECTION_OBJECT_TYPE_FURNI = 0;
export const WIRED_INSPECTION_OBJECT_TYPE_USER = 1;
export const WIRED_INSPECTION_OBJECT_TYPE_GLOBAL = -10;

/** One `WiredGetVariablesForObjectComposer` read: the type and the furni's item id, the user's room index or 0. */
export interface WiredObjectInspectionRequest {
    type: number;
    objectId: number;
}

/** AIR `WiredObjectInspectionData`, as `WiredVariablesForObjectParser` reads it. */
export interface WiredObjectInspectionData {
    type: number;
    objectId: number;
    userIndex: number;
    values: ReadonlyMap<string, number>;
    configuredInWireds: readonly number[];
}

/**
 * What the tab asks the server for: the selected furni, the selected user, or the room. Nothing while
 * the furni or user type has no selection yet (AIR shows its "select a furni/user" instructions then).
 */
export const getWiredObjectInspectionRequest = (
    inspectionType: 'furni' | 'user' | 'global',
    selectedFurni: { objectId: number } | null,
    selectedUser: { roomIndex: number } | null
): WiredObjectInspectionRequest | null => {
    switch (inspectionType) {
        case 'furni':
            return selectedFurni ? { type: WIRED_INSPECTION_OBJECT_TYPE_FURNI, objectId: selectedFurni.objectId } : null;
        case 'user':
            return selectedUser ? { type: WIRED_INSPECTION_OBJECT_TYPE_USER, objectId: selectedUser.roomIndex } : null;
        case 'global':
            return { type: WIRED_INSPECTION_OBJECT_TYPE_GLOBAL, objectId: 0 };
        default:
            return null;
    }
};

/** The object id AIR's `getObjectIdForType` reads from a reply. */
export const getWiredObjectInspectionObjectId = (data: Pick<WiredObjectInspectionData, 'type' | 'objectId' | 'userIndex'>): number => {
    if (data.type === WIRED_INSPECTION_OBJECT_TYPE_USER) return data.userIndex;
    if (data.type === WIRED_INSPECTION_OBJECT_TYPE_FURNI) return data.objectId;

    return 0;
};

/** Whether a reply is about the object the tab currently asks for (AIR drops replies of another type). */
export const isWiredObjectInspectionFor = (data: WiredObjectInspectionData | null, request: WiredObjectInspectionRequest | null): boolean => {
    if (!data || !request) return false;
    if (data.type !== request.type) return false;

    return getWiredObjectInspectionObjectId(data) === request.objectId;
};

const VARIABLE_ID_PREFIX: Record<'user' | 'furni' | 'room', string> = {
    user: 'user:',
    furni: 'furni:',
    room: 'room:'
};

/**
 * The reply's values keyed by the variable definition box id, for the variables of one target. The
 * server keys values by its catalog ids (`user:<box id>`, `furni:<box id>`, `room:<box id>`), the same
 * ids AIR resolves through its full variable list; ids of another target or form are skipped.
 */
export const getWiredObjectInspectionValues = (data: WiredObjectInspectionData | null, target: 'user' | 'furni' | 'room'): Map<number, number> => {
    const values = new Map<number, number>();

    if (!data) return values;

    const prefix = VARIABLE_ID_PREFIX[target];

    for (const [variableId, value] of data.values) {
        if (!variableId.startsWith(prefix)) continue;

        const rest = variableId.slice(prefix.length);

        if (!/^-?\d+$/.test(rest)) continue;

        values.set(Number(rest), value);
    }

    return values;
};

/** Whether AIR's "highlight Wired boxes" button can be pressed: a furni that some box picks. */
export const canHighlightWiredBoxesFor = (data: WiredObjectInspectionData | null): boolean =>
    !!data && data.type === WIRED_INSPECTION_OBJECT_TYPE_FURNI && data.configuredInWireds.length > 0;

/** The inspected object's values in the assignment shape the inspection table and its give/remove buttons read. */
export const toWiredInspectionAssignments = (
    values: ReadonlyMap<number, number>
): Array<{ variableItemId: number; value: number; hasValue: boolean; createdAt: number; updatedAt: number }> =>
    [...values].map(([variableItemId, value]) => ({ variableItemId, value, hasValue: true, createdAt: 0, updatedAt: 0 }));
