import { FC, useEffect, useMemo, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import {
    ARRAY_VARIABLE_CONTEXT,
    ARRAY_VARIABLE_FURNI,
    ARRAY_VARIABLE_ROOM,
    ARRAY_VARIABLE_USER,
    ArrayAddressEditor,
    ArrayReferenceEditor,
    ArrayVariableSelect,
    COMPARISON_LABELS,
    createArrayAddress,
    createArrayReference,
    definitionsForType,
    parseJsonData,
    sourceOptions,
    validAddress,
    validReference,
    WiredArrayAddressData,
    WiredArrayCriterionData,
    WiredArrayDefinitionMetadata,
    WiredArrayReferenceData
} from '../WiredArrayControls';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MODE_INDEX = 0;
const MODE_FIND = 1;
const DIRECTION_FIRST = 0;
const DIRECTION_LAST = 1;
const DIRECTION_RANDOM = 2;
const CRITERIA_ALL = 0;
const CRITERIA_ANY = 1;

interface CaptureArrayData {
    variableType?: number;
    variableItemId?: number;
    contextVariableItemId?: number;
    ownerSource?: number;
    captureMode?: number;
    findDirection?: number;
    criteriaMode?: number;
    index?: Partial<WiredArrayAddressData>;
    criteria?: Array<Partial<WiredArrayCriterionData>>;
    variableDefinitions?: WiredArrayDefinitionMetadata[];
}

const normalizeReference = (value?: Partial<WiredArrayReferenceData>): WiredArrayReferenceData => ({
    ...createArrayReference(),
    ...value,
    value: String(value?.value ?? '0'),
    capturePath: value?.capturePath ?? ''
});

const normalizeAddress = (value?: Partial<WiredArrayAddressData>): WiredArrayAddressData => ({
    ...createArrayAddress(),
    ...value,
    capturePath: value?.capturePath ?? ''
});

const createCriterion = (fieldId: number): WiredArrayCriterionData => ({
    fieldId,
    comparison: 2,
    reference: createArrayReference()
});

export const WiredExtraArrayCaptureVariableView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [definitions, setDefinitions] = useState<WiredArrayDefinitionMetadata[]>([]);
    const [variableType, setVariableType] = useState(ARRAY_VARIABLE_ROOM);
    const [variableItemId, setVariableItemId] = useState(0);
    const [contextVariableItemId, setContextVariableItemId] = useState(0);
    const [ownerSource, setOwnerSource] = useState(0);
    const [captureMode, setCaptureMode] = useState(MODE_INDEX);
    const [findDirection, setFindDirection] = useState(DIRECTION_FIRST);
    const [criteriaMode, setCriteriaMode] = useState(CRITERIA_ALL);
    const [index, setIndex] = useState<WiredArrayAddressData>(createArrayAddress);
    const [criteria, setCriteria] = useState<WiredArrayCriterionData[]>([]);
    const definition = useMemo(
        () => definitions.find((current) => current.variableType === variableType && current.itemId === variableItemId && current.valueShape === 'array'),
        [definitions, variableItemId, variableType]
    );
    const contextDefinitions = useMemo(() => definitionsForType(definitions, ARRAY_VARIABLE_CONTEXT, false), [definitions]);
    const captureAlias = contextDefinitions.find((current) => current.itemId === contextVariableItemId)?.name ?? '';

    useEffect(() => {
        if (!trigger) return;
        const data = parseJsonData<CaptureArrayData>(trigger.stringData, {});

        setDefinitions(Array.isArray(data.variableDefinitions) ? data.variableDefinitions : []);
        setVariableType(trigger.intData[0] ?? data.variableType ?? ARRAY_VARIABLE_ROOM);
        setVariableItemId(data.variableItemId ?? 0);
        setContextVariableItemId(data.contextVariableItemId ?? 0);
        setOwnerSource(trigger.intData[1] ?? data.ownerSource ?? 0);
        setCaptureMode(trigger.intData[2] === MODE_FIND ? MODE_FIND : MODE_INDEX);
        setFindDirection([DIRECTION_LAST, DIRECTION_RANDOM].includes(trigger.intData[3]) ? trigger.intData[3] : DIRECTION_FIRST);
        setCriteriaMode(trigger.intData[4] === CRITERIA_ANY ? CRITERIA_ANY : CRITERIA_ALL);
        setIndex(normalizeAddress(data.index));
        setCriteria(
            (data.criteria ?? []).slice(0, 8).map((criterion) => ({
                fieldId: criterion.fieldId ?? 1,
                comparison: Number.isInteger(criterion.comparison) ? criterion.comparison : 2,
                reference: normalizeReference(criterion.reference)
            }))
        );
    }, [trigger]);

    useEffect(() => {
        if (!definition) return;
        const validFields = new Set(definition.fields.map((field) => field.id));

        setCriteria((current) => {
            const filtered = current.filter((criterion) => validFields.has(criterion.fieldId));

            return filtered.length ? filtered : [createCriterion(definition.fields[0]?.id ?? 1)];
        });
    }, [definition]);

    const chooseType = (nextType: number) => {
        setVariableType(nextType);
        setVariableItemId(definitionsForType(definitions, nextType, true)[0]?.itemId ?? 0);
        setOwnerSource(0);
        setIndex(createArrayAddress());
        setCriteria([]);
    };

    const save = () => {
        setStringParam(
            JSON.stringify({
                variableItemId,
                contextVariableItemId,
                index,
                criteria,
                metadataVersion: 1
            })
        );
        setIntParams([variableType, ownerSource, captureMode, findDirection, criteriaMode]);
    };

    const validate = () => {
        if (!definition || !contextDefinitions.some((current) => current.itemId === contextVariableItemId)) return false;
        if (captureMode === MODE_INDEX) return validAddress(index, definition, definitions);

        return (
            criteria.length >= 1 &&
            criteria.length <= 8 &&
            criteria.every(
                (criterion) =>
                    definition.fields.some((field) => field.id === criterion.fieldId) &&
                    Object.prototype.hasOwnProperty.call(COMPARISON_LABELS, criterion.comparison) &&
                    validReference(criterion.reference, definitions)
            )
        );
    };

    const addCriterion = () => {
        if (criteria.length >= 8 || !definition?.fields.length) return;

        setCriteria((current) => [...current, createCriterion(definition.fields[0].id)]);
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save} validate={validate}>
            <div className="flex flex-col gap-1">
                <ArrayVariableSelect
                    array
                    definitions={definitions}
                    itemId={variableItemId}
                    label="Array variable"
                    variableType={variableType}
                    onTypeChange={chooseType}
                    onItemChange={setVariableItemId}
                />
                {(variableType === ARRAY_VARIABLE_FURNI || variableType === ARRAY_VARIABLE_USER) && (
                    <>
                        <Text bold>Owners</Text>
                        <select className="form-select form-select-sm" value={ownerSource} onChange={(event) => setOwnerSource(Number(event.target.value))}>
                            {sourceOptions(variableType).map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </>
                )}
                <Text bold>Capture namespace</Text>
                <select
                    className="form-select form-select-sm"
                    value={contextVariableItemId || 0}
                    onChange={(event) => setContextVariableItemId(Number(event.target.value))}
                >
                    <option value={0}>Choose scalar Context variable…</option>
                    {contextDefinitions.map((current) => (
                        <option key={current.itemId} value={current.itemId}>
                            {current.name}
                        </option>
                    ))}
                </select>
                {captureAlias && (
                    <Text small>
                        Read as @array.{captureAlias}.found, .index, .length, or a field name. The scalar {captureAlias} receives the captured index (-1 when
                        missing).
                    </Text>
                )}
                <Text bold>Capture mode</Text>
                <select className="form-select form-select-sm" value={captureMode} onChange={(event) => setCaptureMode(Number(event.target.value))}>
                    <option value={MODE_INDEX}>Specific index</option>
                    <option value={MODE_FIND}>Find matching entry</option>
                </select>
                {captureMode === MODE_INDEX ? (
                    <ArrayAddressEditor definitions={definitions} label="Index" value={index} onChange={setIndex} />
                ) : (
                    <>
                        <Text bold>Search direction</Text>
                        <select className="form-select form-select-sm" value={findDirection} onChange={(event) => setFindDirection(Number(event.target.value))}>
                            <option value={DIRECTION_FIRST}>First match</option>
                            <option value={DIRECTION_LAST}>Last match</option>
                            <option value={DIRECTION_RANDOM}>Random match</option>
                        </select>
                        <div className="flex items-center justify-between">
                            <Text bold>Criteria ({criteria.length}/8)</Text>
                            <button className="btn btn-sm btn-primary" disabled={criteria.length >= 8 || !definition} type="button" onClick={addCriterion}>
                                +
                            </button>
                        </div>
                        <select className="form-select form-select-sm" value={criteriaMode} onChange={(event) => setCriteriaMode(Number(event.target.value))}>
                            <option value={CRITERIA_ALL}>All criteria</option>
                            <option value={CRITERIA_ANY}>Any criterion</option>
                        </select>
                        {criteria.map((criterion, criterionIndex) => (
                            <div className="flex flex-col gap-1" key={`${criterion.fieldId}-${criterionIndex}`}>
                                <div className="flex items-center gap-1">
                                    <select
                                        className="form-select form-select-sm"
                                        value={criterion.fieldId}
                                        onChange={(event) =>
                                            setCriteria((current) =>
                                                current.map((value, indexValue) =>
                                                    indexValue === criterionIndex ? { ...value, fieldId: Number(event.target.value) } : value
                                                )
                                            )
                                        }
                                    >
                                        {(definition?.fields ?? []).map((field) => (
                                            <option key={field.id} value={field.id}>
                                                {field.name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="form-select form-select-sm"
                                        value={criterion.comparison}
                                        onChange={(event) =>
                                            setCriteria((current) =>
                                                current.map((value, indexValue) =>
                                                    indexValue === criterionIndex ? { ...value, comparison: Number(event.target.value) } : value
                                                )
                                            )
                                        }
                                    >
                                        {Object.entries(COMPARISON_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        disabled={criteria.length <= 1}
                                        type="button"
                                        onClick={() => setCriteria((current) => current.filter((_, indexValue) => indexValue !== criterionIndex))}
                                    >
                                        ×
                                    </button>
                                </div>
                                <ArrayReferenceEditor
                                    definitions={definitions}
                                    label="Value"
                                    value={criterion.reference}
                                    onChange={(reference) =>
                                        setCriteria((current) =>
                                            current.map((value, indexValue) => (indexValue === criterionIndex ? { ...value, reference } : value))
                                        )
                                    }
                                />
                            </div>
                        ))}
                    </>
                )}
            </div>
        </WiredExtraBaseView>
    );
};
