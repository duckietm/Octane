export const WIRED_ARRAY_TYPE_FURNI = 0;
export const WIRED_ARRAY_TYPE_ROOM = 1;
export const WIRED_ARRAY_TYPE_USER = 2;
export const WIRED_ARRAY_TYPE_CONTEXT = 3;

export const WIRED_ARRAY_MODE_CONSTANT = 0;
export const WIRED_ARRAY_MODE_VARIABLE = 1;

export const WIRED_ARRAY_SIMPLE_FIELD_ID = 1;
export const WIRED_ARRAY_MAX_FIELDS = 8;

export const WIRED_ARRAY_SOURCE_TRIGGER = 0;
export const WIRED_ARRAY_SOURCE_SELECTED = 100;

/** WiredArrayRuntimeSupport.compare - the order is the server's, not alphabetical. */
export const WIRED_ARRAY_COMPARISONS = [0, 1, 2, 3, 4, 5] as const;
export const WIRED_ARRAY_COMPARISON_EQUALS = 2;

export const wiredArrayComparisonSymbol = (comparison: number): string => {
    switch (comparison) {
        case 0:
            return '>';
        case 1:
            return '>=';
        case 3:
            return '<=';
        case 4:
            return '<';
        case 5:
            return '!=';
        default:
            return '==';
    }
};

export const WIRED_ARRAY_OPERATION_APPEND = 0;
export const WIRED_ARRAY_OPERATION_INSERT = 1;
export const WIRED_ARRAY_OPERATION_SET_ENTRY = 2;
export const WIRED_ARRAY_OPERATION_REMOVE = 3;
export const WIRED_ARRAY_OPERATION_REMOVE_FIRST = 4;
export const WIRED_ARRAY_OPERATION_REMOVE_LAST = 5;
export const WIRED_ARRAY_OPERATION_SWAP = 6;
export const WIRED_ARRAY_OPERATION_MOVE = 7;
export const WIRED_ARRAY_OPERATION_CLEAR = 8;
export const WIRED_ARRAY_OPERATION_CLEAR_SLOT = 9;
export const WIRED_ARRAY_OPERATION_SHUFFLE = 10;

interface IWiredArrayOperationRule {
    code: number;
    list: boolean;
    slots: boolean;
    entryValues: boolean;
    firstIndex: boolean;
    secondIndex: boolean;
}

export const WIRED_ARRAY_OPERATIONS: IWiredArrayOperationRule[] = [
    { code: WIRED_ARRAY_OPERATION_APPEND, list: true, slots: false, entryValues: true, firstIndex: false, secondIndex: false },
    { code: WIRED_ARRAY_OPERATION_INSERT, list: true, slots: false, entryValues: true, firstIndex: true, secondIndex: false },
    { code: WIRED_ARRAY_OPERATION_SET_ENTRY, list: true, slots: true, entryValues: true, firstIndex: true, secondIndex: false },
    { code: WIRED_ARRAY_OPERATION_REMOVE, list: true, slots: false, entryValues: false, firstIndex: true, secondIndex: false },
    { code: WIRED_ARRAY_OPERATION_REMOVE_FIRST, list: true, slots: false, entryValues: false, firstIndex: false, secondIndex: false },
    { code: WIRED_ARRAY_OPERATION_REMOVE_LAST, list: true, slots: false, entryValues: false, firstIndex: false, secondIndex: false },
    { code: WIRED_ARRAY_OPERATION_SWAP, list: true, slots: true, entryValues: false, firstIndex: true, secondIndex: true },
    { code: WIRED_ARRAY_OPERATION_MOVE, list: true, slots: false, entryValues: false, firstIndex: true, secondIndex: true },
    { code: WIRED_ARRAY_OPERATION_CLEAR, list: true, slots: true, entryValues: false, firstIndex: false, secondIndex: false },
    { code: WIRED_ARRAY_OPERATION_CLEAR_SLOT, list: false, slots: true, entryValues: false, firstIndex: true, secondIndex: false },
    { code: WIRED_ARRAY_OPERATION_SHUFFLE, list: true, slots: false, entryValues: false, firstIndex: false, secondIndex: false }
];

export const wiredArrayOperationRule = (code: number): IWiredArrayOperationRule | null =>
    WIRED_ARRAY_OPERATIONS.find((operation) => operation.code === code) ?? null;

export const wiredArrayOperationsFor = (mode: string): IWiredArrayOperationRule[] =>
    WIRED_ARRAY_OPERATIONS.filter((operation) => (mode === 'slots' ? operation.slots : operation.list));

export const WIRED_ARRAY_CONDITION_MODE_MATCH = 0;
export const WIRED_ARRAY_CONDITION_MODE_STATE = 1;
export const WIRED_ARRAY_SCOPE_ANY_INDEX = 0;
export const WIRED_ARRAY_SCOPE_SPECIFIC_INDEX = 1;
export const WIRED_ARRAY_CRITERIA_ALL = 0;
export const WIRED_ARRAY_CRITERIA_ANY = 1;
export const WIRED_ARRAY_RESULT_ALL = 0;
export const WIRED_ARRAY_RESULT_AT_LEAST_ONE = 1;
export const WIRED_ARRAY_RESULT_NOT_ALL = 2;
export const WIRED_ARRAY_RESULT_NONE = 3;
export const WIRED_ARRAY_RESULT_LESS_THAN = 4;
export const WIRED_ARRAY_RESULT_EXACTLY = 5;
export const WIRED_ARRAY_RESULT_MORE_THAN = 6;
export const WIRED_ARRAY_STATE_EMPTY = 0;
export const WIRED_ARRAY_STATE_FULL = 2;
export const WIRED_ARRAY_STATE_LENGTH = 3;
export const WIRED_ARRAY_STATE_AVAILABLE_INDEXES = 4;

export const wiredArrayResultNeedsReference = (resultMode: number): boolean =>
    resultMode === WIRED_ARRAY_RESULT_LESS_THAN || resultMode === WIRED_ARRAY_RESULT_EXACTLY || resultMode === WIRED_ARRAY_RESULT_MORE_THAN;

export const wiredArrayStateNeedsReference = (stateCheck: number): boolean =>
    stateCheck === WIRED_ARRAY_STATE_LENGTH || stateCheck === WIRED_ARRAY_STATE_AVAILABLE_INDEXES;

export const WIRED_ARRAY_CAPTURE_MODE_INDEX = 0;
export const WIRED_ARRAY_CAPTURE_MODE_FIND = 1;
export const WIRED_ARRAY_CAPTURE_DIRECTION_FIRST = 0;
export const WIRED_ARRAY_CAPTURE_DIRECTION_LAST = 1;
export const WIRED_ARRAY_CAPTURE_DIRECTION_RANDOM = 2;

export interface IWiredArrayAddress {
    capturePath: string;
    fieldId: number;
    mode: number;
    value: number;
    variableItemId: number;
    variableSource: number;
    variableToken: string;
    variableType: number;
}

export interface IWiredArrayReference {
    address: IWiredArrayAddress;
    capturePath: string;
    mode: number;
    value: string;
    variableItemId: number;
    variableSource: number;
    variableToken: string;
    variableType: number;
}

export interface IWiredArrayCriterion {
    comparison: number;
    fieldId: number;
    reference: IWiredArrayReference;
}

export interface IWiredArrayEditorField {
    id: number;
    name: string;
    order: number;
    textConnected: boolean;
}

export interface IWiredArrayEditorDefinition {
    arrayFormat: string;
    arrayMode: string;
    fields: IWiredArrayEditorField[];
    hasValue: boolean;
    itemId: number;
    maxEntries: number;
    name: string;
    permanent: boolean;
    valueShape: string;
    variableType: number;
    writable: boolean;
}

export const createWiredArrayAddress = (): IWiredArrayAddress => ({
    capturePath: '',
    fieldId: WIRED_ARRAY_SIMPLE_FIELD_ID,
    mode: WIRED_ARRAY_MODE_CONSTANT,
    value: 0,
    variableItemId: 0,
    variableSource: WIRED_ARRAY_SOURCE_TRIGGER,
    variableToken: '',
    variableType: WIRED_ARRAY_TYPE_ROOM
});

export const createWiredArrayReference = (): IWiredArrayReference => ({
    address: createWiredArrayAddress(),
    capturePath: '',
    mode: WIRED_ARRAY_MODE_CONSTANT,
    value: '0',
    variableItemId: 0,
    variableSource: WIRED_ARRAY_SOURCE_TRIGGER,
    variableToken: '',
    variableType: WIRED_ARRAY_TYPE_ROOM
});

export const createWiredArrayCriterion = (fieldId: number = WIRED_ARRAY_SIMPLE_FIELD_ID): IWiredArrayCriterion => ({
    comparison: WIRED_ARRAY_COMPARISON_EQUALS,
    fieldId,
    reference: createWiredArrayReference()
});

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

const asInt = (value: unknown, fallback: number): number => {
    const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);

    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const asText = (value: unknown, fallback: string): string => (typeof value === 'string' ? value : fallback);

const asFlag = (value: unknown): boolean => value === true;

export const normalizeWiredArrayAddress = (value: unknown): IWiredArrayAddress => {
    const raw = asRecord(value);
    const address = createWiredArrayAddress();

    return {
        capturePath: asText(raw.capturePath, address.capturePath),
        fieldId: asInt(raw.fieldId, address.fieldId),
        mode: asInt(raw.mode, address.mode) === WIRED_ARRAY_MODE_VARIABLE ? WIRED_ARRAY_MODE_VARIABLE : WIRED_ARRAY_MODE_CONSTANT,
        value: asInt(raw.value, address.value),
        variableItemId: asInt(raw.variableItemId, address.variableItemId),
        variableSource: asInt(raw.variableSource, address.variableSource),
        variableToken: asText(raw.variableToken, address.variableToken),
        variableType: asInt(raw.variableType, address.variableType)
    };
};

export const normalizeWiredArrayReference = (value: unknown): IWiredArrayReference => {
    const raw = asRecord(value);
    const reference = createWiredArrayReference();

    return {
        address: normalizeWiredArrayAddress(raw.address),
        capturePath: asText(raw.capturePath, reference.capturePath),
        mode: asInt(raw.mode, reference.mode) === WIRED_ARRAY_MODE_VARIABLE ? WIRED_ARRAY_MODE_VARIABLE : WIRED_ARRAY_MODE_CONSTANT,
        // A reference value is a string on the wire: it has to hold numbers wider than an int.
        value: typeof raw.value === 'number' ? String(raw.value) : asText(raw.value, reference.value),
        variableItemId: asInt(raw.variableItemId, reference.variableItemId),
        variableSource: asInt(raw.variableSource, reference.variableSource),
        variableToken: asText(raw.variableToken, reference.variableToken),
        variableType: asInt(raw.variableType, reference.variableType)
    };
};

export const normalizeWiredArrayCriteria = (value: unknown): IWiredArrayCriterion[] => {
    if (!Array.isArray(value)) return [];

    return value.slice(0, WIRED_ARRAY_MAX_FIELDS).map((entry) => {
        const raw = asRecord(entry);

        return {
            comparison: asInt(raw.comparison, WIRED_ARRAY_COMPARISON_EQUALS),
            fieldId: asInt(raw.fieldId, WIRED_ARRAY_SIMPLE_FIELD_ID),
            reference: normalizeWiredArrayReference(raw.reference)
        };
    });
};

const normalizeDefinition = (value: unknown): IWiredArrayEditorDefinition => {
    const raw = asRecord(value);
    const fields = Array.isArray(raw.fields) ? raw.fields : [];

    return {
        arrayFormat: asText(raw.arrayFormat, 'simple'),
        arrayMode: asText(raw.arrayMode, 'list'),
        fields: fields.map((field) => {
            const rawField = asRecord(field);

            return {
                id: asInt(rawField.id, WIRED_ARRAY_SIMPLE_FIELD_ID),
                name: asText(rawField.name, ''),
                order: asInt(rawField.order, 0),
                textConnected: asFlag(rawField.textConnected)
            };
        }),
        hasValue: asFlag(raw.hasValue),
        itemId: asInt(raw.itemId, 0),
        maxEntries: asInt(raw.maxEntries, 0),
        name: asText(raw.name, ''),
        permanent: asFlag(raw.permanent),
        valueShape: asText(raw.valueShape, 'single'),
        variableType: asInt(raw.variableType, WIRED_ARRAY_TYPE_ROOM),
        writable: asFlag(raw.writable)
    };
};

export const normalizeWiredArrayDefinitions = (value: unknown): IWiredArrayEditorDefinition[] =>
    Array.isArray(value) ? value.map(normalizeDefinition).filter((definition) => definition.itemId > 0) : [];

/** Field inputs arrive as a JSON object keyed by field id, because Gson writes a Map that way. */
export const normalizeWiredArrayFieldInputs = (value: unknown): Map<number, IWiredArrayReference> => {
    const result = new Map<number, IWiredArrayReference>();

    for (const [key, reference] of Object.entries(asRecord(value))) {
        const fieldId = asInt(key, 0);

        if (fieldId > 0) result.set(fieldId, normalizeWiredArrayReference(reference));
    }

    return result;
};

export const serializeWiredArrayFieldInputs = (inputs: Map<number, IWiredArrayReference>): Record<string, IWiredArrayReference> => {
    const result: Record<string, IWiredArrayReference> = {};

    for (const [fieldId, reference] of inputs) result[String(fieldId)] = reference;

    return result;
};

export interface IWiredArrayPayloadBase {
    itemIds: number[];
    maxOwnersPerExecution: number;
    metadataVersion: number;
    ownerSource: number;
    variableDefinitions: IWiredArrayEditorDefinition[];
    variableItemId: number;
    variableType: number;
}

const readBase = (raw: Record<string, unknown>): IWiredArrayPayloadBase => ({
    itemIds: Array.isArray(raw.itemIds) ? raw.itemIds.map((id) => asInt(id, 0)).filter((id) => id > 0) : [],
    maxOwnersPerExecution: asInt(raw.maxOwnersPerExecution, 0),
    metadataVersion: asInt(raw.metadataVersion, 1),
    ownerSource: asInt(raw.ownerSource, WIRED_ARRAY_SOURCE_TRIGGER),
    variableDefinitions: normalizeWiredArrayDefinitions(raw.variableDefinitions),
    variableItemId: asInt(raw.variableItemId, 0),
    variableType: asInt(raw.variableType, WIRED_ARRAY_TYPE_ROOM)
});

const readPayload = (stringData: string): Record<string, unknown> => {
    if (!stringData || stringData.charAt(0) !== '{') return {};

    try {
        return asRecord(JSON.parse(stringData));
    } catch {
        return {};
    }
};

export interface IWiredModifyArrayPayload extends IWiredArrayPayloadBase {
    delay: number;
    fieldInputs: Map<number, IWiredArrayReference>;
    firstIndex: IWiredArrayAddress;
    operation: number;
    secondIndex: IWiredArrayAddress;
}

export const parseWiredModifyArrayPayload = (stringData: string): IWiredModifyArrayPayload => {
    const raw = readPayload(stringData);

    return {
        ...readBase(raw),
        delay: asInt(raw.delay, 0),
        fieldInputs: normalizeWiredArrayFieldInputs(raw.fieldInputs),
        firstIndex: normalizeWiredArrayAddress(raw.firstIndex),
        operation: asInt(raw.operation, WIRED_ARRAY_OPERATION_APPEND),
        secondIndex: normalizeWiredArrayAddress(raw.secondIndex)
    };
};

export const serializeWiredModifyArrayPayload = (payload: IWiredModifyArrayPayload): string =>
    JSON.stringify({
        delay: payload.delay,
        fieldInputs: serializeWiredArrayFieldInputs(payload.fieldInputs),
        firstIndex: payload.firstIndex,
        itemIds: payload.itemIds,
        metadataVersion: payload.metadataVersion,
        operation: payload.operation,
        ownerSource: payload.ownerSource,
        secondIndex: payload.secondIndex,
        variableItemId: payload.variableItemId,
        variableType: payload.variableType
    });

export const wiredModifyArrayIntParams = (payload: IWiredModifyArrayPayload): number[] => [payload.variableType, payload.operation, payload.ownerSource];

export interface IWiredCheckArrayPayload extends IWiredArrayPayloadBase {
    conditionMode: number;
    criteria: IWiredArrayCriterion[];
    criteriaMode: number;
    index: IWiredArrayAddress;
    resultMode: number;
    resultReference: IWiredArrayReference;
    searchScope: number;
    stateCheck: number;
    stateComparison: number;
    stateReference: IWiredArrayReference;
}

export const parseWiredCheckArrayPayload = (stringData: string): IWiredCheckArrayPayload => {
    const raw = readPayload(stringData);

    return {
        ...readBase(raw),
        conditionMode: asInt(raw.conditionMode, WIRED_ARRAY_CONDITION_MODE_MATCH),
        criteria: normalizeWiredArrayCriteria(raw.criteria),
        criteriaMode: asInt(raw.criteriaMode, WIRED_ARRAY_CRITERIA_ALL),
        index: normalizeWiredArrayAddress(raw.index),
        resultMode: asInt(raw.resultMode, WIRED_ARRAY_RESULT_AT_LEAST_ONE),
        resultReference: normalizeWiredArrayReference(raw.resultReference),
        searchScope: asInt(raw.searchScope, WIRED_ARRAY_SCOPE_ANY_INDEX),
        stateCheck: asInt(raw.stateCheck, WIRED_ARRAY_STATE_EMPTY),
        stateComparison: asInt(raw.stateComparison, WIRED_ARRAY_COMPARISON_EQUALS),
        stateReference: normalizeWiredArrayReference(raw.stateReference)
    };
};

export const serializeWiredCheckArrayPayload = (payload: IWiredCheckArrayPayload): string =>
    JSON.stringify({
        conditionMode: payload.conditionMode,
        criteria: payload.criteria,
        criteriaMode: payload.criteriaMode,
        index: payload.index,
        itemIds: payload.itemIds,
        metadataVersion: payload.metadataVersion,
        ownerSource: payload.ownerSource,
        resultMode: payload.resultMode,
        resultReference: payload.resultReference,
        searchScope: payload.searchScope,
        stateCheck: payload.stateCheck,
        stateComparison: payload.stateComparison,
        stateReference: payload.stateReference,
        variableItemId: payload.variableItemId,
        variableType: payload.variableType
    });

export const wiredCheckArrayIntParams = (payload: IWiredCheckArrayPayload): number[] => [
    payload.variableType,
    payload.ownerSource,
    payload.conditionMode,
    payload.searchScope,
    payload.criteriaMode,
    payload.resultMode,
    WIRED_ARRAY_COMPARISON_EQUALS,
    payload.stateCheck,
    payload.stateComparison
];

export interface IWiredArrayCapturePayload extends IWiredArrayPayloadBase {
    captureMode: number;
    contextVariableItemId: number;
    criteria: IWiredArrayCriterion[];
    criteriaMode: number;
    findDirection: number;
    index: IWiredArrayAddress;
}

export const parseWiredArrayCapturePayload = (stringData: string): IWiredArrayCapturePayload => {
    const raw = readPayload(stringData);

    return {
        ...readBase(raw),
        captureMode: asInt(raw.captureMode, WIRED_ARRAY_CAPTURE_MODE_INDEX),
        contextVariableItemId: asInt(raw.contextVariableItemId, 0),
        criteria: normalizeWiredArrayCriteria(raw.criteria),
        criteriaMode: asInt(raw.criteriaMode, WIRED_ARRAY_CRITERIA_ALL),
        findDirection: asInt(raw.findDirection, WIRED_ARRAY_CAPTURE_DIRECTION_FIRST),
        index: normalizeWiredArrayAddress(raw.index)
    };
};

export const serializeWiredArrayCapturePayload = (payload: IWiredArrayCapturePayload): string =>
    JSON.stringify({
        captureMode: payload.captureMode,
        contextVariableItemId: payload.contextVariableItemId,
        criteria: payload.criteria,
        criteriaMode: payload.criteriaMode,
        findDirection: payload.findDirection,
        index: payload.index,
        itemIds: payload.itemIds,
        metadataVersion: payload.metadataVersion,
        ownerSource: payload.ownerSource,
        variableItemId: payload.variableItemId,
        variableType: payload.variableType
    });

export const wiredArrayCaptureIntParams = (payload: IWiredArrayCapturePayload): number[] => [
    payload.variableType,
    payload.ownerSource,
    payload.captureMode,
    payload.findDirection,
    payload.criteriaMode
];

export const wiredArrayDefinitionsOfType = (definitions: IWiredArrayEditorDefinition[], variableType: number): IWiredArrayEditorDefinition[] =>
    definitions.filter((definition) => definition.variableType === variableType && definition.valueShape === 'array');

export const findWiredArrayDefinition = (definitions: IWiredArrayEditorDefinition[], variableType: number, itemId: number): IWiredArrayEditorDefinition | null =>
    definitions.find((definition) => definition.variableType === variableType && definition.itemId === itemId) ?? null;

export const wiredArrayFieldsOf = (definition: IWiredArrayEditorDefinition | null): IWiredArrayEditorField[] => {
    if (!definition) return [];
    if (definition.arrayFormat === 'record' && definition.fields.length) return [...definition.fields].sort((first, second) => first.order - second.order);

    return [{ id: WIRED_ARRAY_SIMPLE_FIELD_ID, name: '', order: 0, textConnected: definition.fields[0]?.textConnected ?? false }];
};
