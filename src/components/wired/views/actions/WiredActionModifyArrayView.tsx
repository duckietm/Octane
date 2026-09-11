import { FC, useEffect, useMemo, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import {
    ARRAY_VARIABLE_FURNI,
    ARRAY_VARIABLE_ROOM,
    ARRAY_VARIABLE_USER,
    ArrayAddressEditor,
    ArrayReferenceEditor,
    ArrayVariableSelect,
    createArrayAddress,
    createArrayReference,
    definitionsForType,
    parseJsonData,
    sourceOptions,
    validAddress,
    validReference,
    WiredArrayAddressData,
    WiredArrayDefinitionMetadata,
    WiredArrayReferenceData
} from '../WiredArrayControls';
import { WiredActionBaseView } from './WiredActionBaseView';

const APPEND = 0;
const INSERT = 1;
const SET_ENTRY = 2;
const REMOVE = 3;
const REMOVE_FIRST = 4;
const REMOVE_LAST = 5;
const SWAP = 6;
const MOVE = 7;
const CLEAR = 8;
const CLEAR_SLOT = 9;
const SHUFFLE = 10;

const OPERATIONS = [
    { value: APPEND, label: 'Append', modes: ['list'] },
    { value: INSERT, label: 'Insert', modes: ['list'] },
    { value: SET_ENTRY, label: 'Set / replace entry', modes: ['list', 'slots'] },
    { value: REMOVE, label: 'Remove index', modes: ['list'] },
    { value: REMOVE_FIRST, label: 'Remove first', modes: ['list'] },
    { value: REMOVE_LAST, label: 'Remove last', modes: ['list'] },
    { value: SWAP, label: 'Swap indexes', modes: ['list', 'slots'] },
    { value: MOVE, label: 'Move entry', modes: ['list'] },
    { value: CLEAR, label: 'Clear array', modes: ['list', 'slots'] },
    { value: CLEAR_SLOT, label: 'Clear slot', modes: ['slots'] },
    { value: SHUFFLE, label: 'Shuffle', modes: ['list'] }
];

interface ModifyArrayData {
    variableType?: number;
    variableItemId?: number;
    operation?: number;
    ownerSource?: number;
    firstIndex?: Partial<WiredArrayAddressData>;
    secondIndex?: Partial<WiredArrayAddressData>;
    fieldInputs?: Record<string, Partial<WiredArrayReferenceData>>;
    variableDefinitions?: WiredArrayDefinitionMetadata[];
}

const normalizeAddress = (value?: Partial<WiredArrayAddressData>): WiredArrayAddressData => ({
    ...createArrayAddress(),
    ...value,
    capturePath: value?.capturePath ?? ''
});

const normalizeReference = (value?: Partial<WiredArrayReferenceData>): WiredArrayReferenceData => ({
    ...createArrayReference(),
    ...value,
    value: String(value?.value ?? '0'),
    capturePath: value?.capturePath ?? ''
});

const needsEntry = (operation: number) => [APPEND, INSERT, SET_ENTRY].includes(operation);
const needsFirst = (operation: number) => [INSERT, SET_ENTRY, REMOVE, CLEAR_SLOT, SWAP, MOVE].includes(operation);
const needsSecond = (operation: number) => [SWAP, MOVE].includes(operation);

export const WiredActionModifyArrayView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [variableType, setVariableType] = useState(ARRAY_VARIABLE_ROOM);
    const [variableItemId, setVariableItemId] = useState(0);
    const [operation, setOperation] = useState(APPEND);
    const [ownerSource, setOwnerSource] = useState(0);
    const [firstIndex, setFirstIndex] = useState<WiredArrayAddressData>(createArrayAddress);
    const [secondIndex, setSecondIndex] = useState<WiredArrayAddressData>(createArrayAddress);
    const [fieldInputs, setFieldInputs] = useState<Record<number, WiredArrayReferenceData>>({});
    const [definitions, setDefinitions] = useState<WiredArrayDefinitionMetadata[]>([]);
    const definition = useMemo(
        () => definitions.find((current) => current.variableType === variableType && current.itemId === variableItemId && current.valueShape === 'array'),
        [definitions, variableItemId, variableType]
    );
    const availableOperations = useMemo(() => OPERATIONS.filter((current) => !definition || current.modes.includes(definition.arrayMode)), [definition]);

    useEffect(() => {
        if (!trigger) return;
        const data = parseJsonData<ModifyArrayData>(trigger.stringData, {});
        const nextType = trigger.intData.length > 0 ? trigger.intData[0] : (data.variableType ?? ARRAY_VARIABLE_ROOM);
        const nextOperation = trigger.intData.length > 1 ? trigger.intData[1] : (data.operation ?? APPEND);
        const nextInputs: Record<number, WiredArrayReferenceData> = {};

        Object.entries(data.fieldInputs ?? {}).forEach(([fieldId, reference]) => {
            const parsedId = Number(fieldId);

            if (Number.isInteger(parsedId) && parsedId > 0) nextInputs[parsedId] = normalizeReference(reference);
        });
        setDefinitions(Array.isArray(data.variableDefinitions) ? data.variableDefinitions : []);
        setVariableType(nextType);
        setVariableItemId(data.variableItemId ?? 0);
        setOperation(nextOperation);
        setOwnerSource(trigger.intData.length > 2 ? trigger.intData[2] : (data.ownerSource ?? 0));
        setFirstIndex(normalizeAddress(data.firstIndex));
        setSecondIndex(normalizeAddress(data.secondIndex));
        setFieldInputs(nextInputs);
    }, [trigger]);

    useEffect(() => {
        if (!definition || availableOperations.some((current) => current.value === operation)) return;

        setOperation(availableOperations[0]?.value ?? CLEAR);
    }, [availableOperations, definition, operation]);

    const chooseType = (nextType: number) => {
        const firstDefinition = definitionsForType(definitions, nextType, true)[0];

        setVariableType(nextType);
        setVariableItemId(firstDefinition?.itemId ?? 0);
        setOwnerSource(0);
        setOperation(APPEND);
        setFirstIndex(createArrayAddress());
        setSecondIndex(createArrayAddress());
        setFieldInputs({});
    };

    const chooseDefinition = (itemId: number) => {
        setVariableItemId(itemId);
        setOperation(APPEND);
        setFirstIndex(createArrayAddress());
        setSecondIndex(createArrayAddress());
        setFieldInputs({});
    };

    const save = () => {
        setStringParam(
            JSON.stringify({
                variableItemId,
                firstIndex,
                secondIndex,
                fieldInputs,
                metadataVersion: 1
            })
        );
        setIntParams([variableType, operation, ownerSource]);
    };

    const validate = () => {
        if (!definition || !availableOperations.some((current) => current.value === operation)) return false;
        if (needsFirst(operation) && !validAddress(firstIndex, definition, definitions)) return false;
        if (needsSecond(operation) && !validAddress(secondIndex, definition, definitions)) return false;
        if (!needsEntry(operation)) return true;

        return definition.fields.every((field) => validReference(fieldInputs[field.id] ?? createArrayReference(), definitions));
    };

    const ownerOptions = sourceOptions(variableType);

    return (
        <WiredActionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save} validate={validate}>
            <div className="flex flex-col gap-1">
                <ArrayVariableSelect
                    array
                    definitions={definitions}
                    itemId={variableItemId}
                    label="Array variable"
                    variableType={variableType}
                    onTypeChange={chooseType}
                    onItemChange={chooseDefinition}
                />
                {(variableType === ARRAY_VARIABLE_FURNI || variableType === ARRAY_VARIABLE_USER) && (
                    <>
                        <Text bold>Owners</Text>
                        <select className="form-select form-select-sm" value={ownerSource} onChange={(event) => setOwnerSource(Number(event.target.value))}>
                            {ownerOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </>
                )}
                <Text bold>Operation</Text>
                <select className="form-select form-select-sm" value={operation} onChange={(event) => setOperation(Number(event.target.value))}>
                    {availableOperations.map((current) => (
                        <option key={current.value} value={current.value}>
                            {current.label}
                        </option>
                    ))}
                </select>
                {needsFirst(operation) && (
                    <ArrayAddressEditor
                        definitions={definitions}
                        label={operation === MOVE ? 'From index' : 'Index'}
                        value={firstIndex}
                        onChange={setFirstIndex}
                    />
                )}
                {needsSecond(operation) && (
                    <ArrayAddressEditor
                        definitions={definitions}
                        label={operation === MOVE ? 'To index' : 'Second index'}
                        value={secondIndex}
                        onChange={setSecondIndex}
                    />
                )}
                {needsEntry(operation) &&
                    definition?.fields.map((field) => (
                        <ArrayReferenceEditor
                            key={field.id}
                            definitions={definitions}
                            label={field.name}
                            value={fieldInputs[field.id] ?? createArrayReference()}
                            onChange={(reference) => setFieldInputs((current) => ({ ...current, [field.id]: reference }))}
                        />
                    ))}
            </div>
        </WiredActionBaseView>
    );
};
