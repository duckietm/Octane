import { FC, useEffect, useMemo, useState } from 'react';
import {
    createWiredArrayReference,
    findWiredArrayDefinition,
    IWiredArrayReference,
    IWiredModifyArrayPayload,
    localizeWithFallback,
    parseWiredModifyArrayPayload,
    serializeWiredModifyArrayPayload,
    WIRED_ARRAY_TYPE_CONTEXT,
    WIRED_ARRAY_TYPE_ROOM,
    wiredArrayFieldsOf,
    wiredArrayOperationRule,
    wiredArrayOperationsFor,
    wiredModifyArrayIntParams,
    WiredFurniType
} from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredArrayDefinitionSelect } from '../arrays/WiredArrayDefinitionSelect';
import {
    wiredArrayAddressAsValue,
    WIRED_ARRAY_OWNER_SOURCE_FALLBACKS,
    wiredArrayOwnerSources,
    WiredArrayValueField,
    wiredArrayValueAsAddress
} from '../arrays/WiredArrayValueField';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Select } from '../../../../common/Select';

const OPERATION_FALLBACKS: Record<number, string> = {
    0: 'Add to the end',
    1: 'Insert at',
    2: 'Set the entry at',
    3: 'Remove the entry at',
    4: 'Remove the first entry',
    5: 'Remove the last entry',
    6: 'Swap two entries',
    7: 'Move an entry',
    8: 'Empty the array',
    9: 'Empty one slot',
    10: 'Shuffle the entries'
};

export const WiredActionModifyArrayView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setAllowsFurni = null } = useWired();
    const [payload, setPayload] = useState<IWiredModifyArrayPayload>(() => parseWiredModifyArrayPayload(''));

    useEffect(() => {
        if (!trigger) return;

        const next = parseWiredModifyArrayPayload(trigger.stringData);
        const intData = trigger.intData ?? [];

        setPayload({
            ...next,
            operation: intData.length > 1 ? intData[1] : next.operation,
            ownerSource: intData.length > 2 ? intData[2] : next.ownerSource,
            variableType: intData.length > 0 ? intData[0] : next.variableType
        });
    }, [trigger]);

    useEffect(() => setAllowsFurni(WiredFurniType.STUFF_SELECTION_OPTION_NONE), [setAllowsFurni]);

    const definition = useMemo(
        () => findWiredArrayDefinition(payload.variableDefinitions, payload.variableType, payload.variableItemId),
        [payload.variableDefinitions, payload.variableItemId, payload.variableType]
    );
    const operations = useMemo(() => wiredArrayOperationsFor(definition?.arrayMode ?? 'list'), [definition?.arrayMode]);
    const rule = wiredArrayOperationRule(payload.operation);
    const fields = useMemo(() => wiredArrayFieldsOf(definition), [definition]);
    const ownerSources = useMemo(() => wiredArrayOwnerSources(payload.variableType), [payload.variableType]);

    const fieldInput = (fieldId: number): IWiredArrayReference => payload.fieldInputs.get(fieldId) ?? createWiredArrayReference();

    const setFieldInput = (fieldId: number, reference: IWiredArrayReference) => {
        const fieldInputs = new Map(payload.fieldInputs);

        fieldInputs.set(fieldId, reference);
        setPayload({ ...payload, fieldInputs });
    };

    const save = () => {
        const allowed = new Set(fields.map((field) => field.id));
        const fieldInputs = new Map([...payload.fieldInputs].filter(([fieldId]) => allowed.has(fieldId)));
        const next: IWiredModifyArrayPayload = { ...payload, fieldInputs };

        setStringParam(serializeWiredModifyArrayPayload(next));
        setIntParams(wiredModifyArrayIntParams(next));
    };

    const validate = () => {
        if (!definition) return false;
        if (!rule) return false;
        if (rule.firstIndex && payload.firstIndex.mode === 0 && payload.firstIndex.value < 0) return false;

        return true;
    };

    return (
        <WiredActionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} cardStyle={{ width: 260 }}>
            <div className="flex flex-col gap-2">
                <WiredArrayDefinitionSelect
                    definitions={payload.variableDefinitions}
                    itemId={payload.variableItemId}
                    requiresWritable={true}
                    variableType={payload.variableType}
                    onChange={(variableType, itemId) => setPayload({ ...payload, variableItemId: itemId, variableType })}
                />

                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.arrays.operation', 'What to do')}</Text>
                    <Select
                        className="form-select form-select-sm"
                        value={payload.operation}
                        onChange={(event) => setPayload({ ...payload, operation: parseInt(event.target.value, 10) })}
                    >
                        {operations.map((operation) => (
                            <option key={operation.code} value={operation.code}>
                                {localizeWithFallback(`wiredfurni.params.arrays.operation.${operation.code}`, OPERATION_FALLBACKS[operation.code])}
                            </option>
                        ))}
                    </Select>
                    {definition && !operations.some((operation) => operation.code === payload.operation) && (
                        <Text small className="text-black/60">
                            {localizeWithFallback(
                                'wiredfurni.params.arrays.operation.unsupported',
                                'That operation does not work on this kind of array. Pick another one before saving.'
                            )}
                        </Text>
                    )}
                </div>

                {ownerSources.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.arrays.owner', 'Whose array')}</Text>
                        <Select
                            className="form-select form-select-sm"
                            value={payload.ownerSource}
                            onChange={(event) => setPayload({ ...payload, ownerSource: parseInt(event.target.value, 10) })}
                        >
                            {ownerSources.map((source) => (
                                <option key={source.value} value={source.value}>
                                    {localizeWithFallback(source.label, WIRED_ARRAY_OWNER_SOURCE_FALLBACKS[source.value])}
                                </option>
                            ))}
                        </Select>
                    </div>
                )}

                {rule?.firstIndex && (
                    <WiredArrayValueField
                        constantMin={0}
                        label={localizeWithFallback('wiredfurni.params.arrays.index', 'Index')}
                        recentScope="array-modify-first"
                        value={wiredArrayAddressAsValue(payload.firstIndex)}
                        onChange={(value) => setPayload({ ...payload, firstIndex: wiredArrayValueAsAddress(value, payload.firstIndex) })}
                    />
                )}

                {rule?.secondIndex && (
                    <WiredArrayValueField
                        constantMin={0}
                        label={localizeWithFallback('wiredfurni.params.arrays.index.second', 'Second index')}
                        recentScope="array-modify-second"
                        value={wiredArrayAddressAsValue(payload.secondIndex)}
                        onChange={(value) => setPayload({ ...payload, secondIndex: wiredArrayValueAsAddress(value, payload.secondIndex) })}
                    />
                )}

                {rule?.entryValues &&
                    fields.map((field) => (
                        <WiredArrayValueField
                            key={field.id}
                            label={field.name || localizeWithFallback('wiredfurni.params.arrays.criteria.value', 'Value')}
                            recentScope={`array-modify-field-${field.id}`}
                            value={fieldInput(field.id)}
                            onChange={(value) => setFieldInput(field.id, value)}
                        />
                    ))}

                {definition?.permanent && payload.variableType !== WIRED_ARRAY_TYPE_ROOM && payload.variableType !== WIRED_ARRAY_TYPE_CONTEXT && (
                    <Text small className="text-black/60">
                        {localizeWithFallback('wiredfurni.params.arrays.permanent', 'This array is saved, so the change outlives the room being emptied.')}
                    </Text>
                )}
            </div>
        </WiredActionBaseView>
    );
};
