import { FC, useEffect, useMemo, useState } from 'react';
import {
    findWiredArrayDefinition,
    IWiredCheckArrayPayload,
    localizeWithFallback,
    parseWiredCheckArrayPayload,
    serializeWiredCheckArrayPayload,
    WIRED_ARRAY_COMPARISONS,
    WIRED_ARRAY_CONDITION_MODE_MATCH,
    WIRED_ARRAY_CONDITION_MODE_STATE,
    WIRED_ARRAY_CRITERIA_ALL,
    WIRED_ARRAY_CRITERIA_ANY,
    WIRED_ARRAY_QUANTIFIER_ALL,
    WIRED_ARRAY_QUANTIFIER_ANY,
    WIRED_ARRAY_RESULT_ALL,
    WIRED_ARRAY_RESULT_AT_LEAST_ONE,
    WIRED_ARRAY_RESULT_EXACTLY,
    WIRED_ARRAY_RESULT_LESS_THAN,
    WIRED_ARRAY_RESULT_MORE_THAN,
    WIRED_ARRAY_RESULT_NONE,
    WIRED_ARRAY_RESULT_NOT_ALL,
    WIRED_ARRAY_SCOPE_ANY_INDEX,
    WIRED_ARRAY_SCOPE_SPECIFIC_INDEX,
    WIRED_ARRAY_STATE_AVAILABLE_INDEXES,
    WIRED_ARRAY_STATE_EMPTY,
    WIRED_ARRAY_STATE_FULL,
    WIRED_ARRAY_STATE_LENGTH,
    wiredArrayComparisonSymbol,
    wiredArrayResultNeedsReference,
    wiredArrayStateNeedsReference,
    wiredCheckArrayIntParams,
    WiredFurniType
} from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredArrayCriteriaEditor } from '../arrays/WiredArrayCriteriaEditor';
import { WiredArrayDefinitionSelect } from '../arrays/WiredArrayDefinitionSelect';
import {
    wiredArrayAddressAsValue,
    WIRED_ARRAY_OWNER_SOURCE_FALLBACKS,
    wiredArrayOwnerSources,
    WiredArrayValueField,
    wiredArrayValueAsAddress
} from '../arrays/WiredArrayValueField';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Checkbox } from '../../../../common/Checkbox';

const RESULT_OPTIONS: Array<{ fallback: string; value: number }> = [
    { fallback: 'every entry matches', value: WIRED_ARRAY_RESULT_ALL },
    { fallback: 'at least one entry matches', value: WIRED_ARRAY_RESULT_AT_LEAST_ONE },
    { fallback: 'not every entry matches', value: WIRED_ARRAY_RESULT_NOT_ALL },
    { fallback: 'no entry matches', value: WIRED_ARRAY_RESULT_NONE },
    { fallback: 'fewer than … entries match', value: WIRED_ARRAY_RESULT_LESS_THAN },
    { fallback: 'exactly … entries match', value: WIRED_ARRAY_RESULT_EXACTLY },
    { fallback: 'more than … entries match', value: WIRED_ARRAY_RESULT_MORE_THAN }
];

const STATE_OPTIONS: Array<{ fallback: string; value: number }> = [
    { fallback: 'the array is empty', value: WIRED_ARRAY_STATE_EMPTY },
    { fallback: 'the array is full', value: WIRED_ARRAY_STATE_FULL },
    { fallback: 'how many entries it holds', value: WIRED_ARRAY_STATE_LENGTH },
    { fallback: 'how many slots are free', value: WIRED_ARRAY_STATE_AVAILABLE_INDEXES }
];

export const WiredConditionCheckArrayView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setAllowsFurni = null } = useWired();
    const [payload, setPayload] = useState<IWiredCheckArrayPayload>(() => parseWiredCheckArrayPayload(''));

    useEffect(() => {
        if (!trigger) return;

        const next = parseWiredCheckArrayPayload(trigger.stringData);
        const intData = trigger.intData ?? [];
        const readInt = (index: number, fallback: number) => (intData.length > index ? intData[index] : fallback);

        setPayload({
            ...next,
            conditionMode: readInt(2, next.conditionMode),
            criteriaMode: readInt(4, next.criteriaMode),
            ownerSource: readInt(1, next.ownerSource),
            quantifier: readInt(9, next.quantifier),
            resultMode: readInt(5, next.resultMode),
            searchScope: readInt(3, next.searchScope),
            stateCheck: readInt(7, next.stateCheck),
            stateComparison: readInt(8, next.stateComparison),
            variableType: readInt(0, next.variableType)
        });
    }, [trigger]);

    useEffect(() => setAllowsFurni(WiredFurniType.STUFF_SELECTION_OPTION_NONE), [setAllowsFurni]);

    const definition = useMemo(
        () => findWiredArrayDefinition(payload.variableDefinitions, payload.variableType, payload.variableItemId),
        [payload.variableDefinitions, payload.variableItemId, payload.variableType]
    );
    const ownerSources = useMemo(() => wiredArrayOwnerSources(payload.variableType), [payload.variableType]);
    const isMatch = payload.conditionMode === WIRED_ARRAY_CONDITION_MODE_MATCH;
    const isSpecificIndex = payload.searchScope === WIRED_ARRAY_SCOPE_SPECIFIC_INDEX;

    const save = () => {
        setStringParam(serializeWiredCheckArrayPayload(payload));
        setIntParams(wiredCheckArrayIntParams(payload));
    };

    const validate = () => {
        if (!definition) return false;
        if (isMatch && !payload.criteria.length) return false;

        return true;
    };

    return (
        <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} cardStyle={{ width: 260 }}>
            <div className="flex flex-col gap-2">
                <WiredArrayDefinitionSelect
                    definitions={payload.variableDefinitions}
                    itemId={payload.variableItemId}
                    variableType={payload.variableType}
                    onChange={(variableType, itemId) => setPayload({ ...payload, variableItemId: itemId, variableType })}
                />

                {ownerSources.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.arrays.owner', 'Whose array')}</Text>
                        <select
                            className="form-select form-select-sm"
                            value={payload.ownerSource}
                            onChange={(event) => setPayload({ ...payload, ownerSource: parseInt(event.target.value, 10) })}
                        >
                            {ownerSources.map((source) => (
                                <option key={source.value} value={source.value}>
                                    {localizeWithFallback(source.label, WIRED_ARRAY_OWNER_SOURCE_FALLBACKS[source.value])}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={isMatch}
                            className="form-check-input"
                            name="wiredCheckArrayMode"
                            type="radio"
                            onChange={() => setPayload({ ...payload, conditionMode: WIRED_ARRAY_CONDITION_MODE_MATCH })}
                        />
                        <Text>{localizeWithFallback('wiredfurni.params.arrays.check.entries', 'Its entries')}</Text>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={!isMatch}
                            className="form-check-input"
                            name="wiredCheckArrayMode"
                            type="radio"
                            onChange={() => setPayload({ ...payload, conditionMode: WIRED_ARRAY_CONDITION_MODE_STATE })}
                        />
                        <Text>{localizeWithFallback('wiredfurni.params.arrays.check.state', 'Its state')}</Text>
                    </label>
                </div>

                {isMatch && (
                    <>
                        <div className="flex gap-2">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    checked={!isSpecificIndex}
                                    className="form-check-input"
                                    name="wiredCheckArrayScope"
                                    type="radio"
                                    onChange={() => setPayload({ ...payload, searchScope: WIRED_ARRAY_SCOPE_ANY_INDEX })}
                                />
                                <Text>{localizeWithFallback('wiredfurni.params.arrays.check.anywhere', 'Anywhere')}</Text>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    checked={isSpecificIndex}
                                    className="form-check-input"
                                    name="wiredCheckArrayScope"
                                    type="radio"
                                    onChange={() => setPayload({ ...payload, searchScope: WIRED_ARRAY_SCOPE_SPECIFIC_INDEX })}
                                />
                                <Text>{localizeWithFallback('wiredfurni.params.arrays.check.at_index', 'At one index')}</Text>
                            </label>
                        </div>

                        {isSpecificIndex && (
                            <WiredArrayValueField
                                constantMin={0}
                                label={localizeWithFallback('wiredfurni.params.arrays.index', 'Index')}
                                recentScope="array-check-index"
                                value={wiredArrayAddressAsValue(payload.index)}
                                onChange={(value) => setPayload({ ...payload, index: wiredArrayValueAsAddress(value, payload.index) })}
                            />
                        )}

                        <WiredArrayCriteriaEditor
                            criteria={payload.criteria}
                            definition={definition}
                            onChange={(criteria) => setPayload({ ...payload, criteria })}
                        />

                        <label className="flex items-center gap-1 cursor-pointer">
                            <Checkbox checked={payload.criteriaMode === WIRED_ARRAY_CRITERIA_ANY} onCheckedChange={(nextChecked) => setPayload({ ...payload, criteriaMode: nextChecked ? WIRED_ARRAY_CRITERIA_ANY : WIRED_ARRAY_CRITERIA_ALL })} />
                            <Text>{localizeWithFallback('wiredfurni.params.arrays.criteria.any', 'An entry counts if any rule fits')}</Text>
                        </label>

                        {!isSpecificIndex && (
                            <div className="flex flex-col gap-1">
                                <Text bold>{localizeWithFallback('wiredfurni.params.arrays.check.result', 'Passes when')}</Text>
                                <select
                                    className="form-select form-select-sm"
                                    value={payload.resultMode}
                                    onChange={(event) => setPayload({ ...payload, resultMode: parseInt(event.target.value, 10) })}
                                >
                                    {RESULT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {localizeWithFallback(`wiredfurni.params.arrays.check.result.${option.value}`, option.fallback)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {!isSpecificIndex && wiredArrayResultNeedsReference(payload.resultMode) && (
                            <WiredArrayValueField
                                constantMin={0}
                                label={localizeWithFallback('wiredfurni.params.arrays.check.result.count', 'How many')}
                                recentScope="array-check-result"
                                value={payload.resultReference}
                                onChange={(resultReference) => setPayload({ ...payload, resultReference })}
                            />
                        )}
                    </>
                )}

                {!isMatch && (
                    <>
                        <div className="flex flex-col gap-1">
                            <Text bold>{localizeWithFallback('wiredfurni.params.arrays.check.state.what', 'Check')}</Text>
                            <select
                                className="form-select form-select-sm"
                                value={payload.stateCheck}
                                onChange={(event) => setPayload({ ...payload, stateCheck: parseInt(event.target.value, 10) })}
                            >
                                {STATE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {localizeWithFallback(`wiredfurni.params.arrays.check.state.${option.value}`, option.fallback)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {wiredArrayStateNeedsReference(payload.stateCheck) && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <Text bold>{localizeWithFallback('wiredfurni.params.arrays.criteria.comparison', 'Is')}</Text>
                                    <select
                                        className="form-select form-select-sm"
                                        style={{ maxWidth: 96 }}
                                        value={payload.stateComparison}
                                        onChange={(event) => setPayload({ ...payload, stateComparison: parseInt(event.target.value, 10) })}
                                    >
                                        {WIRED_ARRAY_COMPARISONS.map((comparison) => (
                                            <option key={comparison} value={comparison}>
                                                {wiredArrayComparisonSymbol(comparison)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <WiredArrayValueField
                                    constantMin={0}
                                    label={localizeWithFallback('wiredfurni.params.arrays.criteria.target', 'Compared with')}
                                    recentScope="array-check-state"
                                    value={payload.stateReference}
                                    onChange={(stateReference) => setPayload({ ...payload, stateReference })}
                                />
                            </>
                        )}
                    </>
                )}

                {ownerSources.length > 0 && (
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox checked={payload.quantifier === WIRED_ARRAY_QUANTIFIER_ANY} onCheckedChange={(nextChecked) => setPayload({ ...payload, quantifier: nextChecked ? WIRED_ARRAY_QUANTIFIER_ANY : WIRED_ARRAY_QUANTIFIER_ALL })} />
                        <Text>{localizeWithFallback('wiredfurni.params.arrays.quantifier.any', 'One owner passing is enough')}</Text>
                    </label>
                )}
            </div>
        </WiredConditionBaseView>
    );
};
