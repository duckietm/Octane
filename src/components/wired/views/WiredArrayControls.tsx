import { FC, SelectHTMLAttributes } from 'react';
import { Text } from '../../../common';
import { OctaneInput } from '../../../layout';
import { WiredVariablePicker } from './WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    flattenWiredVariablePickerEntries,
    getCustomVariableItemId,
    WiredVariablePickerTarget
} from './WiredVariablePickerData';

export const ARRAY_VARIABLE_FURNI = 0;
export const ARRAY_VARIABLE_ROOM = 1;
export const ARRAY_VARIABLE_USER = 2;
export const ARRAY_VARIABLE_CONTEXT = 3;
export const ARRAY_REFERENCE_CONSTANT = 0;
export const ARRAY_REFERENCE_VARIABLE = 1;
export const ARRAY_MAX_FIELDS = 8;

export interface WiredArrayFieldMetadata {
    id: number;
    name: string;
    order: number;
    textConnected?: boolean;
}

export type WiredArrayValueShape = 'single' | 'array';

/** The server also reports `array_unavailable` when it cannot parse a stored schema. */
export type WiredArrayServerValueShape = WiredArrayValueShape | 'array_unavailable';

export interface WiredArrayDefinitionMetadata {
    itemId: number;
    name: string;
    variableType: number;
    valueShape: WiredArrayValueShape;
    arrayFormat: 'simple' | 'record';
    arrayMode: 'list' | 'slots';
    maxEntries: number;
    fields: WiredArrayFieldMetadata[];
    permanent: boolean;
    hasValue: boolean;
    writable?: boolean;
}

export interface WiredVariableDefinitionData {
    name: string;
    valueShape: 'single' | 'array';
    arrayFormat: 'simple' | 'record';
    arrayMode: 'list' | 'slots';
    maxEntries: number;
    nextFieldId: number;
    fields: WiredArrayFieldMetadata[];
    schemaVersion: number;
    serverMaxEntries?: number;
    serverMaxPopulatedCells?: number;
}

export interface WiredArrayReferenceData {
    mode: number;
    value: string;
    variableType: number;
    variableItemId: number;
    variableSource: number;
    capturePath: string;
    variableToken?: string;
}

export interface WiredArrayAddressData {
    mode: number;
    value: number;
    variableType: number;
    variableItemId: number;
    variableSource: number;
    capturePath: string;
    variableToken?: string;
    fieldId: number;
}

export type WiredArrayDefinitionInput = Omit<Partial<WiredArrayDefinitionMetadata>, 'itemId' | 'name' | 'valueShape'> & {
    itemId: number;
    name: string;
    valueShape?: WiredArrayServerValueShape;
    isReadOnly?: boolean;
};

export interface WiredArrayCriterionData {
    fieldId: number;
    comparison: number;
    reference: WiredArrayReferenceData;
}

export const VARIABLE_TYPE_LABELS: Record<number, string> = {
    [ARRAY_VARIABLE_FURNI]: 'Furniture',
    [ARRAY_VARIABLE_ROOM]: 'Room',
    [ARRAY_VARIABLE_USER]: 'User',
    [ARRAY_VARIABLE_CONTEXT]: 'Context'
};

export const COMPARISON_LABELS: Record<number, string> = {
    0: '>',
    1: '≥',
    2: '=',
    3: '≤',
    4: '<',
    5: '≠'
};

export const normalizeVariableName = (value: string) =>
    (value ?? '')
        .replace(/[\t\r\n]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9_]/g, '')
        .slice(0, 40);

export const normalizeFieldName = (value: string) => normalizeVariableName(value);

export const parseJsonData = <T,>(value: string, fallback: T): T => {
    if (!value?.trim().startsWith('{')) return fallback;

    try {
        const parsed = JSON.parse(value) as T;

        return parsed ?? fallback;
    } catch {
        return fallback;
    }
};

export const parseVariableDefinition = (value: string): WiredVariableDefinitionData => {
    const scalar: WiredVariableDefinitionData = {
        name: normalizeVariableName(value),
        valueShape: 'single',
        arrayFormat: 'simple',
        arrayMode: 'list',
        maxEntries: 128,
        nextFieldId: 2,
        fields: [],
        schemaVersion: 1
    };
    const parsed = parseJsonData<Partial<WiredVariableDefinitionData>>(value, {});

    if (!value?.trim().startsWith('{')) return scalar;

    const fields = Array.isArray(parsed.fields)
        ? parsed.fields
              .filter((field) => !!field && Number.isInteger(field.id) && field.id > 0)
              .slice(0, ARRAY_MAX_FIELDS)
              .map((field, index) => ({
                  id: field.id,
                  name: normalizeFieldName(field.name),
                  order: index
              }))
        : [];
    const greatestFieldId = fields.reduce((greatest, field) => Math.max(greatest, field.id), 0);

    return {
        name: normalizeVariableName(parsed.name ?? ''),
        valueShape: parsed.valueShape === 'array' ? 'array' : 'single',
        arrayFormat: parsed.arrayFormat === 'record' ? 'record' : 'simple',
        arrayMode: parsed.arrayMode === 'slots' ? 'slots' : 'list',
        maxEntries: Number.isInteger(parsed.maxEntries) && parsed.maxEntries > 0 ? parsed.maxEntries : 128,
        nextFieldId: Number.isInteger(parsed.nextFieldId) && parsed.nextFieldId > greatestFieldId ? parsed.nextFieldId : greatestFieldId + 1,
        fields,
        schemaVersion: 1,
        serverMaxEntries: parsed.serverMaxEntries,
        serverMaxPopulatedCells: parsed.serverMaxPopulatedCells
    };
};

export const serializeVariableDefinition = (definition: WiredVariableDefinitionData) => {
    if (definition.valueShape !== 'array') return normalizeVariableName(definition.name);

    return JSON.stringify({
        name: normalizeVariableName(definition.name),
        valueShape: 'array',
        arrayFormat: definition.arrayFormat,
        arrayMode: definition.arrayMode,
        maxEntries: definition.maxEntries,
        nextFieldId: definition.nextFieldId,
        fields: definition.arrayFormat === 'record' ? definition.fields.map((field, order) => ({ ...field, name: normalizeFieldName(field.name), order })) : [],
        schemaVersion: 1
    });
};

export const createArrayReference = (): WiredArrayReferenceData => ({
    mode: ARRAY_REFERENCE_CONSTANT,
    value: '0',
    variableType: ARRAY_VARIABLE_ROOM,
    variableItemId: 0,
    variableSource: 0,
    capturePath: ''
});

export const createArrayAddress = (): WiredArrayAddressData => ({
    mode: ARRAY_REFERENCE_CONSTANT,
    value: 0,
    variableType: ARRAY_VARIABLE_ROOM,
    variableItemId: 0,
    variableSource: 0,
    capturePath: '',
    fieldId: 1
});

export const collectWiredArrayDefinitions = (
    furni: WiredArrayDefinitionInput[],
    room: WiredArrayDefinitionInput[],
    user: WiredArrayDefinitionInput[],
    context: WiredArrayDefinitionInput[]
): WiredArrayDefinitionMetadata[] => {
    const append = (definitions: WiredArrayDefinitionInput[], variableType: number): WiredArrayDefinitionMetadata[] =>
        definitions
            // a schema the server could not parse is neither a usable array nor a scalar — offer neither
            .filter((definition) => definition.valueShape !== 'array_unavailable')
            .map(
                (definition): WiredArrayDefinitionMetadata => ({
                    itemId: definition.itemId,
                    name: definition.name,
                    variableType,
                    valueShape: definition.valueShape === 'array' ? 'array' : 'single',
                    arrayFormat: definition.arrayFormat === 'record' ? 'record' : 'simple',
                    arrayMode: definition.arrayMode === 'slots' ? 'slots' : 'list',
                    maxEntries: definition.maxEntries ?? 0,
                    fields: definition.fields ?? [],
                    permanent: definition.permanent === true,
                    hasValue: definition.hasValue !== false,
                    writable: definition.writable ?? !definition.isReadOnly
                })
            );

    return [
        ...append(furni, ARRAY_VARIABLE_FURNI),
        ...append(room, ARRAY_VARIABLE_ROOM),
        ...append(user, ARRAY_VARIABLE_USER),
        ...append(context, ARRAY_VARIABLE_CONTEXT)
    ];
};

export const definitionsForType = (definitions: WiredArrayDefinitionMetadata[], variableType: number, array: boolean) =>
    definitions.filter(
        (definition) => definition.variableType === variableType && (definition.valueShape === 'array') === array && (array || definition.hasValue !== false)
    );

export const sourceOptions = (variableType: number) => {
    if (variableType === ARRAY_VARIABLE_FURNI)
        return [
            { value: 100, label: 'Selected furniture' },
            { value: 200, label: 'Selector output' },
            { value: 201, label: 'Signal source' },
            { value: 0, label: 'Trigger furniture' }
        ];
    if (variableType === ARRAY_VARIABLE_USER)
        return [
            { value: 0, label: 'Triggering user' },
            { value: 11, label: 'Clicked user' },
            { value: 200, label: 'Selector output' },
            { value: 201, label: 'Signal source' }
        ];

    return [{ value: 0, label: 'Current scope' }];
};

export const isSignedLong = (value: string) =>
    /^-?\d+$/.test(value ?? '') &&
    (() => {
        try {
            const parsed = BigInt(value);

            return parsed >= -9223372036854775808n && parsed <= 9223372036854775807n;
        } catch {
            return false;
        }
    })();

const ArraySelect: FC<SelectHTMLAttributes<HTMLSelectElement>> = (props) => <select className="form-select form-select-sm" {...props} />;

interface VariableDefinitionArrayEditorProps {
    definition: WiredVariableDefinitionData;
    onChange: (definition: WiredVariableDefinitionData) => void;
}

export const VariableDefinitionArrayEditor: FC<VariableDefinitionArrayEditorProps> = ({ definition, onChange }) => {
    const serverMaximum = Math.max(1, Math.min(2048, definition.serverMaxEntries ?? 2048));
    const set = (patch: Partial<WiredVariableDefinitionData>) => onChange({ ...definition, ...patch });
    const setShape = (value: 'single' | 'array') => {
        if (value === 'single') {
            set({ valueShape: 'single' });

            return;
        }

        set({
            valueShape: 'array',
            maxEntries: Math.max(1, Math.min(serverMaximum, definition.maxEntries || 128)),
            fields:
                definition.arrayFormat === 'record' && !definition.fields.length
                    ? [{ id: Math.max(1, definition.nextFieldId || 1), name: 'Field1', order: 0 }]
                    : definition.fields,
            nextFieldId:
                definition.arrayFormat === 'record' && !definition.fields.length ? Math.max(1, definition.nextFieldId || 1) + 1 : definition.nextFieldId
        });
    };
    const setFormat = (format: 'simple' | 'record') => {
        if (format === 'simple') {
            set({ arrayFormat: 'simple', fields: [] });

            return;
        }

        if (definition.fields.length) {
            set({ arrayFormat: 'record' });

            return;
        }

        const fieldId = Math.max(1, definition.nextFieldId || 1);

        set({
            arrayFormat: 'record',
            fields: [{ id: fieldId, name: 'Field1', order: 0 }],
            nextFieldId: fieldId + 1
        });
    };
    const addField = () => {
        if (definition.fields.length >= ARRAY_MAX_FIELDS) return;
        const fieldId = Math.max(definition.nextFieldId, ...definition.fields.map((field) => field.id + 1), 1);

        set({
            fields: [
                ...definition.fields,
                {
                    id: fieldId,
                    name: `Field${definition.fields.length + 1}`,
                    order: definition.fields.length
                }
            ],
            nextFieldId: fieldId + 1
        });
    };

    return (
        <div className="flex flex-col gap-1">
            <Text bold>Value shape</Text>
            <ArraySelect value={definition.valueShape} onChange={(event) => setShape(event.target.value === 'array' ? 'array' : 'single')}>
                <option value="single">Single value</option>
                <option value="array">Array</option>
            </ArraySelect>
            {definition.valueShape === 'array' && (
                <>
                    <Text bold>Array type</Text>
                    <ArraySelect value={definition.arrayFormat} onChange={(event) => setFormat(event.target.value === 'record' ? 'record' : 'simple')}>
                        <option value="simple">Simple array</option>
                        <option value="record">Record array</option>
                    </ArraySelect>
                    <Text bold>Index behavior</Text>
                    <ArraySelect value={definition.arrayMode} onChange={(event) => set({ arrayMode: event.target.value === 'slots' ? 'slots' : 'list' })}>
                        <option value="list">List (compact)</option>
                        <option value="slots">Slots (sparse)</option>
                    </ArraySelect>
                    <Text bold>Maximum entries</Text>
                    <OctaneInput
                        type="number"
                        min={1}
                        max={serverMaximum}
                        value={definition.maxEntries}
                        onChange={(event) => set({ maxEntries: Math.max(1, Math.min(serverMaximum, Number(event.target.value) || 1)) })}
                    />
                    <Text small>
                        Server limit: {serverMaximum} entries{definition.serverMaxPopulatedCells ? ` / ${definition.serverMaxPopulatedCells} stored cells` : ''}
                    </Text>
                    {definition.arrayFormat === 'record' && (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <Text bold>
                                    Fields ({definition.fields.length}/{ARRAY_MAX_FIELDS})
                                </Text>
                                <button
                                    className="btn btn-sm btn-primary"
                                    disabled={definition.fields.length >= ARRAY_MAX_FIELDS}
                                    type="button"
                                    onClick={addField}
                                >
                                    +
                                </button>
                            </div>
                            {definition.fields.map((field, index) => (
                                <div className="flex items-center gap-1" key={field.id}>
                                    <OctaneInput
                                        maxLength={40}
                                        type="text"
                                        value={field.name}
                                        onChange={(event) =>
                                            set({
                                                fields: definition.fields.map((current, currentIndex) =>
                                                    currentIndex === index ? { ...current, name: normalizeFieldName(event.target.value) } : current
                                                )
                                            })
                                        }
                                    />
                                    <button
                                        className="btn btn-sm btn-danger"
                                        disabled={definition.fields.length <= 1}
                                        type="button"
                                        onClick={() =>
                                            set({
                                                fields: definition.fields
                                                    .filter((_, currentIndex) => currentIndex !== index)
                                                    .map((current, order) => ({ ...current, order }))
                                            })
                                        }
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

interface ArrayVariableSelectProps {
    definitions: WiredArrayDefinitionMetadata[];
    variableType: number;
    itemId: number;
    array: boolean;
    writableOnly?: boolean;
    onTypeChange: (value: number) => void;
    onItemChange: (value: number) => void;
    label?: string;
}

export const ArrayVariableSelect: FC<ArrayVariableSelectProps> = (props) => {
    const options = definitionsForType(props.definitions, props.variableType, props.array).filter(
        (definition) => !props.writableOnly || definition.writable !== false
    );

    return (
        <div className="flex flex-col gap-1">
            {props.label && <Text bold>{props.label}</Text>}
            <ArraySelect value={props.variableType} onChange={(event) => props.onTypeChange(Number(event.target.value))}>
                {Object.entries(VARIABLE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </ArraySelect>
            <ArraySelect value={props.itemId || 0} onChange={(event) => props.onItemChange(Number(event.target.value))}>
                <option value={0}>Choose variable…</option>
                {options.map((definition) => (
                    <option key={definition.itemId} value={definition.itemId}>
                        {definition.name}
                    </option>
                ))}
            </ArraySelect>
        </div>
    );
};

interface ArrayReferenceEditorProps {
    label: string;
    value: WiredArrayReferenceData;
    definitions: WiredArrayDefinitionMetadata[];
    onChange: (value: WiredArrayReferenceData) => void;
}

export const ArrayReferenceEditor: FC<ArrayReferenceEditorProps> = ({ label, value, definitions, onChange }) => {
    const kind = value.mode === ARRAY_REFERENCE_CONSTANT ? 'constant' : value.capturePath ? 'capture' : 'variable';
    const entries = arrayReferenceEntries(definitions, value.variableType);
    const selectedToken = value.variableToken || (value.variableItemId ? `custom:${value.variableItemId}` : '');

    return (
        <div className="flex flex-col gap-1">
            <Text bold>{label}</Text>
            <ArraySelect
                value={kind}
                onChange={(event) => {
                    const nextKind = event.target.value;

                    onChange({
                        ...value,
                        mode: nextKind === 'constant' ? ARRAY_REFERENCE_CONSTANT : ARRAY_REFERENCE_VARIABLE,
                        capturePath: nextKind === 'capture' ? '@array.' : '',
                        variableToken: nextKind === 'capture' ? '' : value.variableToken
                    });
                }}
            >
                <option value="constant">Number</option>
                <option value="variable">Scalar variable</option>
                <option value="capture">Captured field</option>
            </ArraySelect>
            {kind === 'constant' && <OctaneInput type="text" value={value.value} onChange={(event) => onChange({ ...value, value: event.target.value })} />}
            {kind === 'capture' && (
                <OctaneInput
                    maxLength={88}
                    type="text"
                    placeholder="@array.alias.field"
                    value={value.capturePath}
                    onChange={(event) => onChange({ ...value, capturePath: event.target.value.trim() })}
                />
            )}
            {kind === 'variable' && (
                <>
                    <ArraySelect
                        value={value.variableType}
                        onChange={(event) =>
                            onChange({
                                ...value,
                                variableType: Number(event.target.value),
                                variableItemId: 0,
                                variableToken: '',
                                variableSource: 0
                            })
                        }
                    >
                        {Object.entries(VARIABLE_TYPE_LABELS).map(([type, typeLabel]) => (
                            <option key={type} value={type}>
                                {typeLabel}
                            </option>
                        ))}
                    </ArraySelect>
                    <WiredVariablePicker
                        entries={entries}
                        recentScope="array-reference"
                        selectedToken={selectedToken}
                        onSelect={(entry) =>
                            onChange({ ...value, variableToken: entry.token, variableItemId: getCustomVariableItemId(entry.token), capturePath: '' })
                        }
                    />
                    <ArraySelect value={value.variableSource} onChange={(event) => onChange({ ...value, variableSource: Number(event.target.value) })}>
                        {sourceOptions(value.variableType).map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </ArraySelect>
                </>
            )}
        </div>
    );
};

interface ArrayAddressEditorProps {
    label: string;
    value: WiredArrayAddressData;
    definitions: WiredArrayDefinitionMetadata[];
    onChange: (value: WiredArrayAddressData) => void;
}

export const ArrayAddressEditor: FC<ArrayAddressEditorProps> = ({ label, value, definitions, onChange }) => {
    const reference: WiredArrayReferenceData = { ...value, value: String(value.value) };

    return (
        <ArrayReferenceEditor
            label={label}
            value={reference}
            definitions={definitions}
            onChange={(next) =>
                onChange({
                    ...next,
                    value: Number.isSafeInteger(Number(next.value)) ? Number(next.value) : 0,
                    fieldId: value.fieldId
                })
            }
        />
    );
};

const ARRAY_PICKER_TARGETS: Record<number, WiredVariablePickerTarget> = {
    [ARRAY_VARIABLE_FURNI]: 'furni',
    [ARRAY_VARIABLE_ROOM]: 'global',
    [ARRAY_VARIABLE_USER]: 'user',
    [ARRAY_VARIABLE_CONTEXT]: 'context'
};

export const arrayReferenceEntries = (definitions: WiredArrayDefinitionMetadata[], variableType: number) =>
    buildWiredVariablePickerEntries(
        ARRAY_PICKER_TARGETS[variableType] ?? 'global',
        'change-reference',
        definitionsForType(definitions, variableType, false).map((definition) => ({ ...definition, availability: 0 }))
    );

export const arrayFieldIsTextConnected = (definition: WiredArrayDefinitionMetadata | undefined, fieldId: number, scalarConnected: boolean) =>
    definition ? definition.fields.some((field) => field.id === fieldId && field.textConnected === true) : scalarConnected;

export const validReference = (reference: WiredArrayReferenceData, definitions: WiredArrayDefinitionMetadata[]) => {
    if (reference.mode === ARRAY_REFERENCE_CONSTANT) return isSignedLong(reference.value);
    if (reference.variableToken) {
        return flattenWiredVariablePickerEntries(arrayReferenceEntries(definitions, reference.variableType)).some(
            (entry) => entry.token === reference.variableToken && entry.selectable && entry.hasValue && entry.valueShape !== 'array'
        );
    }
    if (reference.capturePath) return /^@array\.[A-Za-z0-9_]{1,40}\.[A-Za-z0-9_]{1,40}$/i.test(reference.capturePath);

    return definitions.some(
        (definition) =>
            definition.itemId === reference.variableItemId &&
            definition.variableType === reference.variableType &&
            definition.valueShape === 'single' &&
            definition.hasValue !== false
    );
};

export const validAddress = (address: WiredArrayAddressData, definition: WiredArrayDefinitionMetadata, definitions: WiredArrayDefinitionMetadata[]) => {
    if (address.mode === ARRAY_REFERENCE_CONSTANT)
        return !!definition && Number.isInteger(address.value) && address.value >= 0 && address.value < definition.maxEntries;

    return validReference({ ...address, value: String(address.value) }, definitions);
};
