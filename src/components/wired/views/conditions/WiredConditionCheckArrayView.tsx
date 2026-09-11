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
import { WiredConditionBaseView } from './WiredConditionBaseView';

const MODE_MATCH = 0;
const MODE_STATE = 1;
const SCOPE_ANY_INDEX = 0;
const SCOPE_SPECIFIC_INDEX = 1;
const CRITERIA_ALL = 0;
const CRITERIA_ANY = 1;
const QUANTIFIER_ALL = 0;
const QUANTIFIER_ANY = 1;
const RESULT_AT_LEAST_ONE = 1;
const STATE_EMPTY = 0;
const STATE_FULL = 2;
const STATE_LENGTH = 3;
const STATE_AVAILABLE = 4;

const RESULT_OPTIONS = [
    { value: 0, label: 'Every occupied entry' },
    { value: 1, label: 'At least one entry' },
    { value: 2, label: 'Not every entry' },
    { value: 3, label: 'No entries' },
    { value: 4, label: 'Match count < value' },
    { value: 5, label: 'Match count = value' },
    { value: 6, label: 'Match count > value' }
];

interface CheckArrayData {
    variableType?: number;
    variableItemId?: number;
    ownerSource?: number;
    conditionMode?: number;
    searchScope?: number;
    criteriaMode?: number;
    resultMode?: number;
    stateCheck?: number;
    stateComparison?: number;
    quantifier?: number;
    index?: Partial<WiredArrayAddressData>;
    criteria?: Array<Partial<WiredArrayCriterionData>>;
    resultReference?: Partial<WiredArrayReferenceData>;
    stateReference?: Partial<WiredArrayReferenceData>;
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

export const WiredConditionCheckArrayView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [definitions, setDefinitions] = useState<WiredArrayDefinitionMetadata[]>([]);
    const [variableType, setVariableType] = useState(ARRAY_VARIABLE_ROOM);
    const [variableItemId, setVariableItemId] = useState(0);
    const [ownerSource, setOwnerSource] = useState(0);
    const [conditionMode, setConditionMode] = useState(MODE_MATCH);
    const [searchScope, setSearchScope] = useState(SCOPE_ANY_INDEX);
    const [criteriaMode, setCriteriaMode] = useState(CRITERIA_ALL);
    const [resultMode, setResultMode] = useState(RESULT_AT_LEAST_ONE);
    const [stateCheck, setStateCheck] = useState(STATE_EMPTY);
    const [stateComparison, setStateComparison] = useState(2);
    const [quantifier, setQuantifier] = useState(QUANTIFIER_ALL);
    const [index, setIndex] = useState<WiredArrayAddressData>(createArrayAddress);
    const [criteria, setCriteria] = useState<WiredArrayCriterionData[]>([]);
    const [resultReference, setResultReference] = useState<WiredArrayReferenceData>(createArrayReference);
    const [stateReference, setStateReference] = useState<WiredArrayReferenceData>(createArrayReference);
    const definition = useMemo(
        () => definitions.find((current) => current.variableType === variableType && current.itemId === variableItemId && current.valueShape === 'array'),
        [definitions, variableItemId, variableType]
    );

    useEffect(() => {
        if (!trigger) return;
        const data = parseJsonData<CheckArrayData>(trigger.stringData, {});
        const nextCriteria = (data.criteria ?? []).slice(0, 8).map((criterion) => ({
            fieldId: criterion.fieldId ?? 1,
            comparison: Number.isInteger(criterion.comparison) ? criterion.comparison : 2,
            reference: normalizeReference(criterion.reference)
        }));

        setDefinitions(Array.isArray(data.variableDefinitions) ? data.variableDefinitions : []);
        setVariableType(trigger.intData[0] ?? data.variableType ?? ARRAY_VARIABLE_ROOM);
        setVariableItemId(data.variableItemId ?? 0);
        setOwnerSource(trigger.intData[1] ?? data.ownerSource ?? 0);
        setConditionMode(trigger.intData[2] === MODE_STATE ? MODE_STATE : MODE_MATCH);
        setSearchScope(trigger.intData[3] === SCOPE_SPECIFIC_INDEX ? SCOPE_SPECIFIC_INDEX : SCOPE_ANY_INDEX);
        setCriteriaMode(trigger.intData[4] === CRITERIA_ANY ? CRITERIA_ANY : CRITERIA_ALL);
        setResultMode(trigger.intData[5] ?? data.resultMode ?? RESULT_AT_LEAST_ONE);
        setStateCheck(trigger.intData[7] ?? data.stateCheck ?? STATE_EMPTY);
        setStateComparison(trigger.intData[8] ?? data.stateComparison ?? 2);
        setQuantifier(trigger.intData[9] === QUANTIFIER_ANY ? QUANTIFIER_ANY : QUANTIFIER_ALL);
        setIndex(normalizeAddress(data.index));
        setCriteria(nextCriteria);
        setResultReference(normalizeReference(data.resultReference));
        setStateReference(normalizeReference(data.stateReference));
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
        const firstDefinition = definitionsForType(definitions, nextType, true)[0];

        setVariableType(nextType);
        setVariableItemId(firstDefinition?.itemId ?? 0);
        setOwnerSource(0);
        setCriteria([]);
        setIndex(createArrayAddress());
    };

    const chooseDefinition = (itemId: number) => {
        setVariableItemId(itemId);
        setCriteria([]);
        setIndex(createArrayAddress());
    };

    const save = () => {
        setStringParam(
            JSON.stringify({
                variableItemId,
                index,
                criteria,
                resultReference,
                stateReference,
                metadataVersion: 1
            })
        );
        setIntParams([variableType, ownerSource, conditionMode, searchScope, criteriaMode, resultMode, 2, stateCheck, stateComparison, quantifier]);
    };

    const validate = () => {
        if (!definition) return false;
        if (conditionMode === MODE_STATE) {
            return ![STATE_LENGTH, STATE_AVAILABLE].includes(stateCheck) || validReference(stateReference, definitions);
        }
        if (!criteria.length || criteria.length > 8) return false;
        if (
            !criteria.every(
                (criterion) =>
                    definition.fields.some((field) => field.id === criterion.fieldId) &&
                    Object.prototype.hasOwnProperty.call(COMPARISON_LABELS, criterion.comparison) &&
                    validReference(criterion.reference, definitions)
            )
        )
            return false;
        if (searchScope === SCOPE_SPECIFIC_INDEX) return validAddress(index, definition, definitions);

        return ![4, 5, 6].includes(resultMode) || validReference(resultReference, definitions);
    };

    const addCriterion = () => {
        if (criteria.length >= 8 || !definition?.fields.length) return;

        setCriteria((current) => [...current, createCriterion(definition.fields[0].id)]);
    };

    return (
        <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save} validate={validate}>
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
                            {sourceOptions(variableType).map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <Text bold>Owner rule</Text>
                        <select className="form-select form-select-sm" value={quantifier} onChange={(event) => setQuantifier(Number(event.target.value))}>
                            <option value={QUANTIFIER_ALL}>All owners must pass</option>
                            <option value={QUANTIFIER_ANY}>Any owner may pass</option>
                        </select>
                    </>
                )}
                <Text bold>Check</Text>
                <select className="form-select form-select-sm" value={conditionMode} onChange={(event) => setConditionMode(Number(event.target.value))}>
                    <option value={MODE_MATCH}>Entry values</option>
                    <option value={MODE_STATE}>Array state</option>
                </select>
                {conditionMode === MODE_STATE ? (
                    <>
                        <select className="form-select form-select-sm" value={stateCheck} onChange={(event) => setStateCheck(Number(event.target.value))}>
                            <option value={STATE_EMPTY}>Is empty</option>
                            <option value={STATE_FULL}>Is full</option>
                            <option value={STATE_LENGTH}>Length compared with…</option>
                            <option value={STATE_AVAILABLE}>Available indexes compared with…</option>
                        </select>
                        {[STATE_LENGTH, STATE_AVAILABLE].includes(stateCheck) && (
                            <>
                                <select
                                    className="form-select form-select-sm"
                                    value={stateComparison}
                                    onChange={(event) => setStateComparison(Number(event.target.value))}
                                >
                                    {Object.entries(COMPARISON_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <ArrayReferenceEditor definitions={definitions} label="Compare with" value={stateReference} onChange={setStateReference} />
                            </>
                        )}
                    </>
                ) : (
                    <>
                        <Text bold>Search</Text>
                        <select className="form-select form-select-sm" value={searchScope} onChange={(event) => setSearchScope(Number(event.target.value))}>
                            <option value={SCOPE_ANY_INDEX}>Search the array</option>
                            <option value={SCOPE_SPECIFIC_INDEX}>Check one index</option>
                        </select>
                        {searchScope === SCOPE_SPECIFIC_INDEX && (
                            <ArrayAddressEditor definitions={definitions} label="Index" value={index} onChange={setIndex} />
                        )}
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
                        {searchScope === SCOPE_ANY_INDEX && (
                            <>
                                <Text bold>Result rule</Text>
                                <select
                                    className="form-select form-select-sm"
                                    value={resultMode}
                                    onChange={(event) => setResultMode(Number(event.target.value))}
                                >
                                    {RESULT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                {[4, 5, 6].includes(resultMode) && (
                                    <ArrayReferenceEditor definitions={definitions} label="Match count" value={resultReference} onChange={setResultReference} />
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </WiredConditionBaseView>
    );
};
